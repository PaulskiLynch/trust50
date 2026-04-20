"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { buildCredibilityProfile } from "@/lib/credibility";

type User = {
  id: string;
  email: string;
  name: string | null;
  headline?: string | null;
  linkedinUrl?: string | null;
  workEmail?: string | null;
};

type Reply = {
  id: string;
  body: string;
  signal?: string | null;
  createdAt: string;
  senderId: string;
  sender?: User | null;
};

type Introduction = {
  id: string;
  connectorId: string;
  targetUserId: string;
  status: string;
  note?: string | null;
  createdAt: string;
  connector?: User | null;
  targetUser?: User | null;
  conversation?: { id: string } | null;
};

type Discussion = {
  id: string;
  title?: string | null;
  content: string;
  kind: "request" | "question" | "insight" | "update";
  status: string;
  outcome?: string | null;
  outcomeType?:
    | "decision_made"
    | "hire_completed"
    | "introduced_to_someone"
    | "direction_clarified"
    | "no_longer_pursuing"
    | null;
  helpfulSource?: string | null;
  resolvedAt?: string | null;
  pinned: boolean;
  createdAt: string;
  creatorId: string;
  creator?: User | null;
  groupId: string;
  group: {
    id: string;
    name: string;
    ownerId: string;
    owner?: User | null;
    memberships: { userId: string; role: string; user?: User | null }[];
  };
  replies: Reply[];
  introductions: Introduction[];
};

type PageProps = {
  params: Promise<{
    id: string;
    discussionId: string;
  }>;
};

function discussionTitle(discussion: Discussion) {
  if (discussion.title?.trim()) return discussion.title.trim();
  return discussion.content.length > 60 ? `${discussion.content.slice(0, 57)}...` : discussion.content;
}

function getDiscussionStatusLabel(discussion: Discussion) {
  if (discussion.status !== "open") return "Resolved";

  const latestActivity = discussion.replies.at(-1)?.createdAt || discussion.createdAt;
  const hoursSince = (Date.now() - new Date(latestActivity).getTime()) / (1000 * 60 * 60);

  if (discussion.replies.length >= 2 && hoursSince <= 72) return "Active discussion";
  if (hoursSince > 72) return "Quiet";
  return "Open";
}

function getDiscussionKindLabel(kind: Discussion["kind"]) {
  switch (kind) {
    case "question":
      return "Question";
    case "insight":
      return "Insight";
    case "update":
      return "Fundraising";
    default:
      return "Hiring";
  }
}

function getOutcomeTypeLabel(type?: Discussion["outcomeType"]) {
  switch (type) {
    case "decision_made":
      return "Decision made";
    case "hire_completed":
      return "Hire completed";
    case "introduced_to_someone":
      return "Introduced to someone";
    case "direction_clarified":
      return "Direction clarified";
    case "no_longer_pursuing":
      return "No longer pursuing";
    default:
      return null;
  }
}

function trustBadgeClasses(level: "New" | "Contributor" | "Trusted") {
  if (level === "Trusted") return "bg-stone-900 text-white";
  if (level === "Contributor") return "bg-stone-100 text-stone-700";
  return "bg-amber-100 text-amber-800";
}

function formatRelativeMoment(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;
  if (diff < hour) return "under 1h ago";
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))}h ago`;
  const days = Math.max(1, Math.round(diff / day));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatThreadTimestamp(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DiscussionPage({ params }: PageProps) {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id ?? null;
  const [routeParams, setRouteParams] = useState<{ id: string; discussionId: string } | null>(null);
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyBody, setReplyBody] = useState("");
  const [outcome, setOutcome] = useState("");
  const [outcomeType, setOutcomeType] = useState<NonNullable<Discussion["outcomeType"]> | "">("");
  const [helpfulSource, setHelpfulSource] = useState("");
  const [showResolveModal, setShowResolveModal] = useState(false);

  useEffect(() => {
    void params.then(setRouteParams);
  }, [params]);

  useEffect(() => {
    if (!routeParams) return;
    void (async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/requests/${routeParams.discussionId}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Unable to load discussion");
        setDiscussion(data);
        setOutcome(data.outcome || "");
        setOutcomeType(data.outcomeType || "");
        setHelpfulSource(data.helpfulSource || "");
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Unable to load discussion");
      } finally {
        setLoading(false);
      }
    })();
  }, [routeParams]);

  const canModerate = useMemo(() => {
    if (!discussion || !currentUserId) return false;
    return discussion.creatorId === currentUserId || discussion.group.ownerId === currentUserId;
  }, [currentUserId, discussion]);

  const canResolve = useMemo(() => {
    if (!discussion || !currentUserId) return false;
    return discussion.creatorId === currentUserId;
  }, [currentUserId, discussion]);

  const shouldNudgeResolve = useMemo(() => {
    if (!discussion || !canResolve || discussion.status !== "open") return false;
    const latestActivity = discussion.replies.at(-1)?.createdAt || discussion.createdAt;
    const daysSince = (Date.now() - new Date(latestActivity).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 5;
  }, [canResolve, discussion]);

  const credibilityByUserId = useMemo(() => {
    if (!discussion) return new Map<string, ReturnType<typeof buildCredibilityProfile>>();

    const sourceGroup = {
      id: discussion.group.id,
      name: discussion.group.name,
      memberships: discussion.group.memberships.map((membership) => ({
        userId: membership.userId,
        status: "active",
      })),
      requests: [
        {
          kind: discussion.kind,
          title: discussion.title,
          content: discussion.content,
          creatorId: discussion.creatorId,
          replies: discussion.replies.map((reply) => ({
            senderId: reply.senderId,
            body: reply.body,
            signal: reply.signal,
            createdAt: reply.createdAt,
          })),
        },
      ],
    };

    const users = new Map<string, User | null>();
    discussion.group.memberships.forEach((membership) => users.set(membership.userId, membership.user || null));
    users.set(discussion.creatorId, discussion.creator || users.get(discussion.creatorId) || null);
    discussion.replies.forEach((reply) => users.set(reply.senderId, reply.sender || users.get(reply.senderId) || null));

    return new Map(
      [...users.entries()].map(([userId, user]) => [userId, buildCredibilityProfile(userId, [sourceGroup], user || undefined)]),
    );
  }, [discussion]);

  async function postReply() {
    if (!discussion || !replyBody.trim()) return;

    const response = await fetch(`/api/requests/${discussion.id}/replies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: replyBody.trim(), signal: "Useful perspective" }),
    });
    const data = await response.json();
    if (!response.ok) {
      setFlash(data.error ?? "Unable to reply");
      return;
    }
    setReplyBody("");
    setDiscussion((current) => current ? { ...current, replies: [...current.replies, data] } : current);
  }

  async function updateDiscussion(status: "open" | "closed") {
    if (!discussion) return;
    const response = await fetch(`/api/requests/${discussion.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, outcome, outcomeType: outcomeType || null, helpfulSource: helpfulSource || null }),
    });
    const data = await response.json();
    if (!response.ok) {
      setFlash(data.error ?? "Unable to update discussion");
      return;
    }
    setDiscussion((current) => current ? { ...current, ...data } : current);
    setFlash(status === "closed" ? "Discussion resolved" : "Discussion reopened");
    if (status === "closed") setShowResolveModal(false);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-5xl space-y-8">
        <Link href={routeParams ? `/groups/${routeParams.id}` : "/"} className="text-sm font-medium text-muted transition hover:text-foreground">
          Back to group
        </Link>

        {flash ? <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">{flash}</div> : null}

        {loading || !discussion ? (
          <div className="rounded-3xl border border-line bg-panel p-8 text-sm text-muted">Loading discussion...</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
            <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
              <div className="rounded-2xl border border-line bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{discussion.creator?.name || discussion.creator?.email || discussion.creatorId}</p>
                    {credibilityByUserId.get(discussion.creatorId) ? (
                      <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${trustBadgeClasses(credibilityByUserId.get(discussion.creatorId)!.trustLevel)}`}>
                        {credibilityByUserId.get(discussion.creatorId)!.trustLevel}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">{getDiscussionKindLabel(discussion.kind)}</span>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">{getDiscussionStatusLabel(discussion)}</span>
                  </div>
                  {canResolve && discussion.status === "open" ? (
                    <button
                      type="button"
                      onClick={() => setShowResolveModal(true)}
                      className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground"
                    >
                      Mark as resolved
                    </button>
                  ) : null}
                </div>
                {discussion.status !== "open" && discussion.outcome ? (
                  <div className="mt-4 rounded-2xl bg-panel px-4 py-4">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Outcome</p>
                    <p className="mt-2 text-sm text-foreground">{discussion.outcome}</p>
                    {getOutcomeTypeLabel(discussion.outcomeType) ? (
                      <p className="mt-2 text-sm text-muted">{getOutcomeTypeLabel(discussion.outcomeType)}</p>
                    ) : null}
                    {discussion.helpfulSource ? (
                      <p className="mt-2 text-sm text-muted">Based on input from {discussion.helpfulSource}</p>
                    ) : null}
                  </div>
                ) : null}
                <h1 className="mt-3 text-3xl font-semibold tracking-tight">{discussionTitle(discussion)}</h1>
                <p className="mt-3 text-base leading-7 text-foreground">{discussion.content}</p>
                <p className="mt-3 text-sm text-muted">Started {formatRelativeMoment(discussion.createdAt)} in {discussion.group.name}</p>
              </div>

              {shouldNudgeResolve ? (
                <div className="mt-5 rounded-2xl border border-line bg-white p-5">
                  <p className="text-sm font-medium text-foreground">Did this discussion lead to a decision?</p>
                  <p className="mt-1 text-sm text-muted">Mark it as resolved so the room stays focused on active topics.</p>
                  <button
                    type="button"
                    onClick={() => setShowResolveModal(true)}
                    className="mt-3 rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground"
                  >
                    Mark as resolved
                  </button>
                </div>
              ) : null}

              <div className="mt-5 rounded-2xl border border-line bg-white p-5">
                <h2 className="text-lg font-semibold">Replies</h2>
                <div className="mt-4 space-y-3">
                  {!discussion.replies.length ? <p className="text-sm text-muted">No replies yet. Be the first to help.</p> : null}
                  {discussion.replies.map((reply) => (
                    <div key={reply.id} className="rounded-2xl border border-line px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{reply.sender?.name || reply.sender?.email || reply.senderId}</p>
                        {credibilityByUserId.get(reply.senderId) ? (
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${trustBadgeClasses(credibilityByUserId.get(reply.senderId)!.trustLevel)}`}>
                            {credibilityByUserId.get(reply.senderId)!.trustLevel}
                          </span>
                        ) : null}
                        {credibilityByUserId.get(reply.senderId)?.knownFor[0] ? (
                          <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-700">
                            Known for {credibilityByUserId.get(reply.senderId)!.knownFor[0]}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm text-foreground">{reply.body}</p>
                      <p className="mt-2 text-sm text-muted">
                        {formatRelativeMoment(reply.createdAt)} · {formatThreadTimestamp(reply.createdAt)}
                        {reply.signal ? ` · ${reply.signal}` : ""}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl border border-dashed border-line p-4">
                  <p className="text-sm font-medium">Reply</p>
                  <p className="mt-1 text-sm text-muted">Share perspective, context, or the next step you would suggest.</p>
                  <textarea className="mt-3 min-h-24 w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground" value={replyBody} onChange={(event) => setReplyBody(event.target.value)} placeholder="Add a thoughtful public reply." />
                  <button type="button" onClick={() => void postReply()} className="mt-3 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                    Post reply
                  </button>
                </div>
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Private follow-up</h2>
                <p className="mt-1 text-sm text-muted">Keep public replies primary. Move into direct follow-up only when it helps the discussion progress.</p>
                <div className="mt-4 space-y-3">
                  {discussion.introductions.length ? discussion.introductions.map((intro) => (
                    <div key={intro.id} className="rounded-2xl border border-line bg-white px-4 py-4">
                      <p className="font-medium">{intro.connector?.name || intro.connectorId}</p>
                      <p className="mt-2 text-sm text-foreground">{intro.note || "Relevant follow-up offered."}</p>
                      <p className="mt-2 text-sm text-muted">{intro.status === "accepted" ? "Conversation started" : intro.status === "pending" ? "Waiting on reply" : "Not taken forward"}</p>
                      {intro.conversation ? <Link href={`/conversations/${intro.conversation.id}`} className="mt-3 inline-flex rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground">Open conversation</Link> : null}
                    </div>
                  )) : <p className="text-sm text-muted">No private follow-up yet.</p>}
                </div>
              </section>

              {discussion.status !== "open" && canModerate ? (
                <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                  <h2 className="text-lg font-semibold">Discussion state</h2>
                  <p className="mt-1 text-sm text-muted">This thread has been resolved and moved out of the active feed.</p>
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => void updateDiscussion("open")}
                      className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground"
                    >
                      Reopen discussion
                    </button>
                  </div>
                </section>
              ) : null}
            </aside>
          </div>
        )}
      </div>

      {showResolveModal && discussion ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-6">
          <div className="w-full max-w-xl rounded-3xl border border-line bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Mark this discussion as resolved</h2>
                <p className="mt-1 text-sm text-muted">Capture the outcome so the room can learn from it later.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="text-sm font-medium text-muted transition hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-sm font-medium">Outcome summary</span>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                  value={outcome}
                  onChange={(event) => setOutcome(event.target.value)}
                  placeholder="What happened? (e.g. 'Maya intro'd me to her VP Product; first interview scheduled' or 'Decided to hire internally instead')"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Outcome type</span>
                <select
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                  value={outcomeType}
                  onChange={(event) => setOutcomeType(event.target.value as NonNullable<Discussion["outcomeType"]> | "")}
                >
                  <option value="">Optional</option>
                  <option value="decision_made">Decision made</option>
                  <option value="hire_completed">Hire completed</option>
                  <option value="introduced_to_someone">Introduced to someone</option>
                  <option value="direction_clarified">Direction clarified</option>
                  <option value="no_longer_pursuing">No longer pursuing</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium">Who or what was most helpful?</span>
                <input
                  className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                  value={helpfulSource}
                  onChange={(event) => setHelpfulSource(event.target.value)}
                  placeholder="Optional reference to replies or contributors"
                />
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowResolveModal(false)}
                className="rounded-full border border-line px-4 py-2 text-sm font-medium transition hover:border-foreground"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void updateDiscussion("closed")}
                disabled={!outcome.trim()}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark as resolved
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

