"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type User = {
  id: string;
  email: string;
  name: string | null;
  headline?: string | null;
};

type MembershipVote = {
  id: string;
  voterId: string;
  createdAt: string;
  voter?: User | null;
};

type Membership = {
  id: string;
  userId: string;
  status: string;
  recommendedByUserId?: string | null;
  createdAt: string;
  fitWhy?: string | null;
  contributionWhy?: string | null;
  relevantContext?: string | null;
  recommendedBy?: User | null;
  user?: User | null;
  votes?: MembershipVote[];
};

type Group = {
  id: string;
  name: string;
  ownerId: string;
  memberships: Membership[];
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatJoinedLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function applicantName(membership: Membership) {
  return membership.user?.name || membership.user?.email || membership.userId;
}

function applicantHeadline(membership: Membership) {
  return membership.user?.headline || "Applicant";
}

function supportSummary(count: number, threshold: number) {
  const remaining = Math.max(0, threshold - count);
  if (remaining === 0) return "Ready for admission";
  if (count === 0) return `Needs ${threshold} attestations`;
  return `${remaining} more ${remaining === 1 ? "attestation" : "attestations"} needed`;
}

function StatPill({ label }: { label: string }) {
  return <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">{label}</span>;
}

function ApplicationPanels({ membership }: { membership: Membership }) {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <div className="rounded-2xl border border-line bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Fit</p>
        <p className="mt-2 text-sm text-foreground">{membership.fitWhy || "No fit statement yet."}</p>
      </div>
      <div className="rounded-2xl border border-line bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Contribution</p>
        <p className="mt-2 text-sm text-foreground">
          {membership.contributionWhy || "No contribution statement yet."}
        </p>
      </div>
      <div className="rounded-2xl border border-line bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Context</p>
        <p className="mt-2 text-sm text-foreground">{membership.relevantContext || "No extra context yet."}</p>
      </div>
    </div>
  );
}

export default function GroupVotesPage({ params }: PageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [groupId, setGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [recommendingId, setRecommendingId] = useState<string | null>(null);

  useEffect(() => {
    void params.then((value) => setGroupId(value.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!groupId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/groups/${groupId}`);
      const data = (await response.json()) as Group | { error?: string };

      if (!response.ok) {
        throw new Error(("error" in data && data.error) || "Unable to load member review");
      }

      setGroup(data as Group);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to load member review");
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) void load();
  }, [groupId, load]);

  const activeMembers = useMemo(
    () => group?.memberships.filter((membership) => membership.status === "active") ?? [],
    [group],
  );

  const voteThreshold = useMemo(
    () => Math.max(1, Math.ceil(activeMembers.length * 0.2)),
    [activeMembers.length],
  );

  const candidates = useMemo(
    () =>
      [...(group?.memberships.filter((membership) => membership.status === "pending") ?? [])].sort((left, right) => {
        const leftRecommended = left.recommendedBy ? 1 : 0;
        const rightRecommended = right.recommendedBy ? 1 : 0;
        if (leftRecommended !== rightRecommended) return rightRecommended - leftRecommended;
        return (right.votes?.length ?? 0) - (left.votes?.length ?? 0);
      }),
    [group],
  );

  const queuedCandidates = useMemo(
    () => group?.memberships.filter((membership) => membership.status === "waitlist") ?? [],
    [group],
  );

  const isEligibleVoter = useMemo(
    () => activeMembers.some((membership) => membership.userId === currentUserId) || group?.ownerId === currentUserId,
    [activeMembers, currentUserId, group?.ownerId],
  );

  async function handleSupport(membershipId: string) {
    if (!group) return;

    setSubmittingId(membershipId);
    setFlash(null);

    try {
      const response = await fetch(`/api/groups/${group.id}/votes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ membershipId }),
      });

      const data = (await response.json()) as { error?: string; accepted?: boolean };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to record attestation");
      }

      setFlash(data.accepted ? "Candidate admitted to the room." : "Attestation recorded.");
      await load();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to record attestation");
    } finally {
      setSubmittingId(null);
    }
  }

  async function handleRecommend(membershipId: string) {
    if (!group) return;

    setRecommendingId(membershipId);
    setFlash(null);

    try {
      const response = await fetch(`/api/groups/${group.id}/recommend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ membershipId }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to sponsor candidate");
      }

      setFlash("Candidate sponsored and moved into active review.");
      await load();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to sponsor candidate");
    } finally {
      setRecommendingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href={groupId ? `/groups/${groupId}` : "/"}
          className="text-sm font-medium text-muted transition hover:text-foreground"
        >
          Back to room
        </Link>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">
              Member review {group ? `· ${group.name}` : ""}
            </h1>
            <p className="text-sm text-muted">
              New members move through member review. Admission happens once at least 20% of active members attest that the fit is real.
            </p>
            <div className="flex flex-wrap gap-2">
              <StatPill label={`${activeMembers.length} active members`} />
              <StatPill label={`${voteThreshold} attestation${voteThreshold === 1 ? "" : "s"} needed`} />
              <StatPill label={`${candidates.length} in active review`} />
              <StatPill label={`${queuedCandidates.length} waiting for sponsor`} />
            </div>
          </div>

          {flash ? (
            <div className="mt-5 rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">{flash}</div>
          ) : null}

          {loading ? (
            <div className="mt-5 rounded-2xl border border-line bg-panel px-4 py-6 text-sm text-muted">
              Loading candidates...
            </div>
          ) : null}

          {!loading && !isEligibleVoter ? (
            <div className="mt-5 rounded-2xl border border-line bg-panel px-4 py-6 text-sm text-muted">
              Only active members can sponsor applicants or attest fit.
            </div>
          ) : null}

          {!loading && isEligibleVoter ? (
            <div className="mt-6 space-y-8">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Active review</h2>
                  <p className="mt-1 text-sm text-muted">
                    These applicants already have a member sponsor and now need room attestations before they are admitted.
                  </p>
                </div>

                {!candidates.length ? (
                  <p className="text-sm text-muted">No candidates are in active review right now.</p>
                ) : null}

                {candidates.map((membership) => {
                  const supportCount = membership.votes?.length ?? 0;
                  const alreadySupported = membership.votes?.some((vote) => vote.voterId === currentUserId);

                  return (
                    <div key={membership.id} className="rounded-2xl border border-line bg-panel p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{applicantName(membership)}</p>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                              Sponsored
                            </span>
                            <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-muted">
                              Active review
                            </span>
                          </div>
                          <p className="text-sm text-muted">{applicantHeadline(membership)}</p>
                          <p className="text-xs text-muted">Applied {formatJoinedLabel(membership.createdAt)}</p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {supportCount}/{voteThreshold} attestations
                          </p>
                          <p className="mt-1 text-xs text-muted">{supportSummary(supportCount, voteThreshold)}</p>
                          <p className="mt-1 text-xs text-muted">
                            Sponsored by {membership.recommendedBy?.name || membership.recommendedBy?.email}
                          </p>
                        </div>
                      </div>

                      <ApplicationPanels membership={membership} />

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-muted">
                          {supportCount > 0
                            ? `${supportCount} member${supportCount === 1 ? "" : "s"} already attest to this fit.`
                            : "No attestations recorded yet."}
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleSupport(membership.id)}
                          disabled={alreadySupported || submittingId === membership.id}
                          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {alreadySupported
                            ? "Attested"
                            : submittingId === membership.id
                              ? "Saving..."
                              : "Attest fit"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Needs sponsor</h2>
                  <p className="mt-1 text-sm text-muted">
                    These applicants are queued. One active member sponsor moves them into room review.
                  </p>
                </div>

                {!queuedCandidates.length ? (
                  <p className="text-sm text-muted">No one is waiting in the queue right now.</p>
                ) : null}

                {queuedCandidates.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border border-line bg-panel p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">{applicantName(membership)}</p>
                          <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-muted">
                            Queued
                          </span>
                        </div>
                        <p className="text-sm text-muted">{applicantHeadline(membership)}</p>
                        <p className="text-xs text-muted">Applied {formatJoinedLabel(membership.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">Needs sponsor</p>
                        <p className="mt-1 text-xs text-muted">
                          Once sponsored, the room will see this applicant in active review.
                        </p>
                      </div>
                    </div>

                    <ApplicationPanels membership={membership} />

                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-muted">A sponsor is the first signal that this person belongs in the room.</p>
                      <button
                        type="button"
                        onClick={() => void handleRecommend(membership.id)}
                        disabled={recommendingId === membership.id}
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {recommendingId === membership.id ? "Sponsoring..." : "Sponsor for review"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
