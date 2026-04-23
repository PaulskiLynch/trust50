"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type User = {
  id: string;
  email: string;
  name: string | null;
  headline?: string | null;
};

type Membership = {
  id: string;
  userId: string;
  role?: string;
  status: string;
  user?: User | null;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  memberships: Membership[];
};

const MIN_FIT_LENGTH = 20;
const MIN_CONTRIBUTION_LENGTH = 20;
const MIN_CONTEXT_LENGTH = 12;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ApplyPage({ params }: PageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [groupId, setGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [fitWhy, setFitWhy] = useState("");
  const [contributionWhy, setContributionWhy] = useState("");
  const [relevantContext, setRelevantContext] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void params.then((value) => setGroupId(value.id));
  }, [params]);

  useEffect(() => {
    if (!groupId) return;

    void (async () => {
      setLoading(true);

      try {
        const response = await fetch(`/api/groups/${groupId}`);
        const data = (await response.json()) as Group | { error?: string };

        if (!response.ok) {
          throw new Error(("error" in data && data.error) || "Unable to load room");
        }

        setGroup(data as Group);
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Unable to load room");
      } finally {
        setLoading(false);
      }
    })();
  }, [groupId]);

  const currentMembership = useMemo(
    () => group?.memberships.find((membership) => membership.userId === currentUserId) ?? null,
    [currentUserId, group],
  );
  const isActiveMember = currentMembership?.status === "active";
  const isPendingMember =
    currentMembership?.status === "pending" ||
    currentMembership?.status === "waitlist" ||
    currentMembership?.status === "invited";

  async function handleApply() {
    if (!group) return;

    const trimmedFit = fitWhy.trim();
    const trimmedContribution = contributionWhy.trim();
    const trimmedContext = relevantContext.trim();

    if (trimmedFit.length < MIN_FIT_LENGTH) {
      setFlash(`Your fit statement needs at least ${MIN_FIT_LENGTH} characters so the room can evaluate real relevance.`);
      return;
    }

    if (trimmedContribution.length < MIN_CONTRIBUTION_LENGTH) {
      setFlash(`Your contribution statement needs at least ${MIN_CONTRIBUTION_LENGTH} characters so members can judge what you would add.`);
      return;
    }

    if (trimmedContext.length < MIN_CONTEXT_LENGTH) {
      setFlash(`Add a little more context (${MIN_CONTEXT_LENGTH}+ characters) so the room understands your situation.`);
      return;
    }

    setSubmitting(true);
    setFlash(null);

    try {
      const response = await fetch(`/api/groups/${group.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fitWhy: trimmedFit,
          contributionWhy: trimmedContribution,
          relevantContext: trimmedContext,
        }),
      });

      const data = (await response.json()) as Membership | { error?: string; status?: string };

      if (!response.ok) {
        throw new Error(("error" in data && data.error) || "Unable to apply");
      }

      const returnedMembership = data as Membership;
      setGroup((current) =>
        current
          ? {
              ...current,
              memberships: [
                ...current.memberships.filter((membership) => membership.userId !== currentUserId),
                returnedMembership,
              ],
            }
          : current,
      );
      setFitWhy("");
      setContributionWhy("");
      setRelevantContext("");
      setFlash("Application submitted. You are now in the queue for this room.");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to apply");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">
        <Link href={groupId ? `/groups/${groupId}` : "/"} className="text-sm font-medium text-muted transition hover:text-foreground">
          Back to room
        </Link>

        <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Apply to join {group?.name || "this room"}
            </h1>
            <p className="text-sm text-muted">
              Strong applications explain fit, contribution, and why this room should be one of your four.
            </p>
          </div>

          {flash ? (
            <div className="mt-5 rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">{flash}</div>
          ) : null}

          {loading ? (
            <div className="mt-5 rounded-2xl border border-line bg-panel px-4 py-6 text-sm text-muted">Loading room...</div>
          ) : null}

          {!loading && group ? (
            <div className="mt-5 space-y-5">
              <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">
                <p>{group.description || "A private room built around thoughtful professional decisions."}</p>
                <p className="mt-2">Sponsorship happens inside the room. Applicants cannot self-claim one.</p>
              </div>

              {!currentUserId ? (
                <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">
                  <p className="font-medium text-foreground">Sign in to request access.</p>
                  <p className="mt-1">Applications are tied to your account so the room can evaluate real fit and contribution.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href="/"
                      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground"
                    >
                      Create account
                    </Link>
                  </div>
                </div>
              ) : null}

              {isActiveMember ? (
                <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">
                  <p className="font-medium text-foreground">You are already in this room.</p>
                  <p className="mt-1">You do not need to apply again. Open the room and join the discussion.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={groupId ? `/groups/${groupId}` : "/"}
                      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Open room
                    </Link>
                  </div>
                </div>
              ) : null}

              {isPendingMember ? (
                <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">
                  <p className="font-medium text-foreground">Your application is already in motion.</p>
                  <p className="mt-1">
                    {currentMembership?.status === "pending"
                      ? "You are in active review now."
                      : "You are in the queue for this room."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href={groupId ? `/groups/${groupId}` : "/"}
                      className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground"
                    >
                      Back to room
                    </Link>
                    {currentMembership?.status === "pending" ? (
                      <Link
                        href={groupId ? `/groups/${groupId}/votes` : "/"}
                        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                      >
                        View member review
                      </Link>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {!isActiveMember && !isPendingMember ? (
                <>
              <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-4 text-sm text-muted">
                <p className="font-medium text-foreground">What a strong application looks like</p>
                <p className="mt-2">
                  Be concrete about the decisions you face, the peers you relate to, and the judgment you would contribute back.
                </p>
              </div>
              <label className="block space-y-2">
                <span className="text-sm font-medium">Why are you a good fit for this room?</span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                  value={fitWhy}
                  onChange={(event) => setFitWhy(event.target.value)}
                  placeholder="Share the stage, problems, or perspective that make this room relevant to you."
                />
                <p className="text-xs text-muted">{fitWhy.trim().length}/{MIN_FIT_LENGTH}+ characters</p>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">What would you contribute if accepted?</span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                  value={contributionWhy}
                  onChange={(event) => setContributionWhy(event.target.value)}
                  placeholder="What kind of context, experience, or decision support would people here get from you?"
                />
                <p className="text-xs text-muted">{contributionWhy.trim().length}/{MIN_CONTRIBUTION_LENGTH}+ characters</p>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Relevant context</span>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                  value={relevantContext}
                  onChange={(event) => setRelevantContext(event.target.value)}
                  placeholder="Current role, company stage, market, or the kind of decisions you are working through."
                />
                <p className="text-xs text-muted">{relevantContext.trim().length}/{MIN_CONTEXT_LENGTH}+ characters</p>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => void handleApply()}
                  disabled={!currentUserId || submitting}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit application"}
                </button>
                <Link
                  href={groupId ? `/groups/${groupId}` : "/"}
                  className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground"
                >
                  Cancel
                </Link>
              </div>
                </>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

