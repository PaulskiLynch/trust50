"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type User = {
  id: string;
  email: string;
  name: string | null;
  headline?: string | null;
  avatarUrl?: string | null;
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

function voucherSummary(count: number, threshold: number) {
  const remaining = Math.max(0, threshold - count);
  if (remaining === 0) return "Ready for admission";
  return `Needs ${remaining} more ${remaining === 1 ? "voucher" : "vouchers"}`;
}

function StatPill({ label }: { label: string }) {
  return <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">{label}</span>;
}

function candidateQuote(membership: Membership) {
  return membership.relevantContext || membership.contributionWhy || membership.fitWhy || applicantHeadline(membership);
}

function profileCompleteness(membership: Membership) {
  return [membership.fitWhy, membership.contributionWhy, membership.relevantContext].filter(Boolean).length;
}

function PassIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function Avatar({ membership }: { membership: Membership }) {
  if (membership.user?.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={membership.user.avatarUrl} alt={applicantName(membership)} className="h-12 w-12 rounded-full object-cover" />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/profile-placeholder.svg" alt={applicantName(membership)} className="h-12 w-12 rounded-full object-cover" />
  );
}

function DetailBlock({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 text-sm leading-6 text-foreground">{value}</p>
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
        throw new Error(("error" in data && data.error) || "Unable to load vouching");
      }

      setGroup(data as Group);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to load vouching");
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
        throw new Error(data.error ?? "Unable to record vouch");
      }

      setFlash(data.accepted ? "Candidate admitted to the room." : "Vouch recorded.");
      await load();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to record vouch");
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

      setFlash("Candidate sponsored and moved into motion.");
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
              Vouching {group ? `· ${group.name}` : ""}
            </h1>
            <p className="text-sm text-muted">
              Quick member judgment first. Open a profile only when you need more context.
            </p>
            <div className="flex flex-wrap gap-2">
              <StatPill label={`${activeMembers.length} active members`} />
              <StatPill label={`${voteThreshold} ${voteThreshold === 1 ? "voucher" : "vouchers"} needed`} />
              <StatPill label={`${candidates.length} in review`} />
              <StatPill label={`${queuedCandidates.length} queued`} />
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
              Only active members can sponsor applicants or vouch for fit.
            </div>
          ) : null}

          {!loading && isEligibleVoter ? (
            <div className="mt-6 space-y-8">
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">In Review</h2>
                  <p className="mt-1 text-sm text-muted">
                    Sponsored applicants who need one fast trust read from the room.
                  </p>
                </div>

                {!candidates.length ? (
                  <p className="text-sm text-muted">No candidates are awaiting vouches right now.</p>
                ) : null}

                {candidates.map((membership) => {
                  const supportCount = membership.votes?.length ?? 0;
                  const alreadySupported = membership.votes?.some((vote) => vote.voterId === currentUserId);
                  const sponsorName = membership.recommendedBy?.name || membership.recommendedBy?.email || "Member sponsor";
                  const completeness = profileCompleteness(membership);

                  return (
                    <div key={membership.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                      <div className="flex gap-3">
                        <Avatar membership={membership} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-foreground">{applicantName(membership)}</p>
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-800">
                              In Review
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-muted">{applicantHeadline(membership)}</p>
                          <p className="mt-1 text-xs text-muted">Sponsored by {sponsorName}</p>
                        </div>

                        <div className="hidden shrink-0 text-right sm:block">
                          <p className="text-sm font-medium text-foreground">{voucherSummary(supportCount, voteThreshold)}</p>
                          <p className="mt-1 text-xs text-muted">
                            {supportCount} {supportCount === 1 ? "member" : "members"} endorsed
                          </p>
                        </div>
                      </div>

                      <p className="mt-3 rounded-2xl bg-panel px-4 py-3 text-sm leading-6 text-foreground">
                        &ldquo;{candidateQuote(membership)}&rdquo;
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span>{voucherSummary(supportCount, voteThreshold)}</span>
                        <span>·</span>
                        <span>{supportCount} {supportCount === 1 ? "member" : "members"} endorsed</span>
                        <span>·</span>
                        <span>Profile {Math.round((completeness / 3) * 100)}% complete</span>
                      </div>

                      <details className="mt-3 rounded-2xl border border-line bg-panel px-4 py-3">
                        <summary className="cursor-pointer text-sm font-medium text-foreground">
                          View profile
                        </summary>
                        <div className="mt-4 space-y-4">
                          <DetailBlock label="Fit" value={membership.fitWhy} />
                          <DetailBlock label="Contribution" value={membership.contributionWhy} />
                          <DetailBlock label="Context" value={membership.relevantContext} />
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Sponsorship</p>
                            <p className="mt-1 text-sm leading-6 text-foreground">
                              Sponsored by {sponsorName}. Applied {formatJoinedLabel(membership.createdAt)}.
                            </p>
                          </div>
                        </div>
                      </details>

                      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setFlash("Passed for now.")}
                          title="Pass"
                          aria-label="Pass"
                          className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition hover:border-foreground hover:text-foreground"
                        >
                          <PassIcon />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSupport(membership.id)}
                          disabled={alreadySupported || submittingId === membership.id}
                          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {alreadySupported
                            ? "Vouched"
                            : submittingId === membership.id
                              ? "Saving..."
                              : "Voucher"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">Needs Sponsor</h2>
                  <p className="mt-1 text-sm text-muted">
                    Compact queue. Sponsor only when you recognize enough signal to bring someone forward.
                  </p>
                </div>

                {!queuedCandidates.length ? (
                  <p className="text-sm text-muted">No one is waiting in the queue right now.</p>
                ) : null}

                {queuedCandidates.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border border-line bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 gap-3">
                        <Avatar membership={membership} />
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-foreground">{applicantName(membership)}</p>
                            <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] text-muted">
                              Queued
                            </span>
                          </div>
                          <p className="text-sm text-muted">{applicantHeadline(membership)}</p>
                          <p className="mt-1 text-sm leading-6 text-foreground">&ldquo;{candidateQuote(membership)}&rdquo;</p>
                          <p className="mt-1 text-xs text-muted">
                            Profile {Math.round((profileCompleteness(membership) / 3) * 100)}% complete
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setFlash("Passed for now.")}
                        title="Pass"
                        aria-label="Pass"
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-muted transition hover:border-foreground hover:text-foreground"
                      >
                        <PassIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRecommend(membership.id)}
                        disabled={recommendingId === membership.id}
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {recommendingId === membership.id ? "Sponsoring..." : "Sponsor"}
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
