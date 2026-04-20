"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GroupStatus } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { buildCredibilityProfile } from "@/lib/credibility";

type DemoUser = {
  id: string;
  email: string;
  name: string | null;
  headline?: string | null;
  avatarUrl?: string | null;
  linkedinUrl?: string | null;
  workEmail?: string | null;
};

type Introduction = {
  id: string;
  requestId: string;
  connectorId: string;
  targetUserId: string;
  note: string | null;
  status: string;
  createdAt: string;
  acceptedAt: string | null;
  conversation?: {
    id: string;
    participantOneId: string;
    participantTwoId: string;
  } | null;
  connector?: DemoUser | null;
  targetUser?: DemoUser | null;
};

type Reply = {
  id: string;
  body: string;
  signal?: string | null;
  createdAt: string;
  senderId: string;
  sender?: DemoUser | null;
};

type Membership = {
  id: string;
  userId: string;
  groupId: string;
  recommendedByUserId?: string | null;
  role: string;
  status: string;
  fitWhy?: string | null;
  contributionWhy?: string | null;
  relevantContext?: string | null;
  createdAt: string;
  votes?: { id: string; voterId: string; createdAt: string }[];
  recommendedBy?: DemoUser | null;
  user?: DemoUser | null;
};

type GroupRequest = {
  id: string;
  title?: string | null;
  content: string;
  kind: "request" | "question" | "insight" | "update";
  creatorId: string;
  groupId: string;
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
  creator?: DemoUser | null;
  replies: Reply[];
  introductions: Introduction[];
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  whoFor: string;
  whoNotFor: string;
  valueProp: string;
  ownerId: string;
  status: GroupStatus;
  memberCount: number;
  publishedAt: string | null;
  memberships: Membership[];
  requests: GroupRequest[];
  owner?: DemoUser | null;
};

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

const statusCopy: Record<GroupStatus, string> = {
  draft: "Draft",
  emerging: "Forming",
  active: "Active",
};

const statusClasses: Record<GroupStatus, string> = {
  draft: "bg-stone-200 text-stone-700",
  emerging: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
};

function formatRelativeMoment(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diff < hour) return "Last activity under 1h ago";
  if (diff < day) return `Last activity ${Math.max(1, Math.round(diff / hour))}h ago`;

  const days = Math.max(1, Math.round(diff / day));
  return `Last activity ${days} day${days === 1 ? "" : "s"} ago`;
}

function formatJoinedLabel(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function shortenRequest(content: string) {
  if (content.toLowerCase().includes("fintech cfo")) {
    return "Fintech CFO search (Berlin)";
  }

  return content.length > 56 ? `${content.slice(0, 53)}...` : content;
}

function discussionTitle(request: GroupRequest) {
  if (request.title?.trim()) {
    return request.title.trim();
  }

  return shortenRequest(request.content);
}

function getMemberActivityLabel(contributionCount: number) {
  if (contributionCount >= 3) return "Active this week";
  if (contributionCount >= 1) return "Active recently";
  return "Quiet lately";
}

function memberInitials(name?: string | null, email?: string | null) {
  const source = name?.trim() || email || "FH";
  return source
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function trustBadgeClasses(level: "New" | "Contributor" | "Trusted") {
  if (level === "Trusted") return "bg-stone-900 text-white";
  if (level === "Contributor") return "bg-stone-100 text-stone-700";
  return "bg-amber-100 text-amber-800";
}

const discussionTypeMeta: Record<
  GroupRequest["kind"],
  {
    label: string;
    description: string;
    titlePlaceholder: string;
    bodyPrompt: string;
    bodyExample: string;
    bullets: string[];
  }
> = {
  question: {
    label: "Question",
    description: "Need perspective on a tradeoff, judgment call, or real decision.",
    titlePlaceholder: "What do you want the group to weigh in on?",
    bodyPrompt: "What context would help others give a useful answer?",
    bodyExample:
      "Example: We're debating whether to expand to the US before Phase II. EU team, early US investor traction, limited bandwidth. Unsure whether earlier presence helps enough to justify the distraction.",
    bullets: ["What stage are you at?", "What have you already tried?", "Where are you unsure?"],
  },
  insight: {
    label: "Insight",
    description: "Share a pattern, lesson, or shift others should notice early.",
    titlePlaceholder: "What are you seeing that others should know?",
    bodyPrompt: "Share a pattern, observation, or shift you're seeing.",
    bodyExample:
      "Example: Enterprise buying cycles have stretched by 6-8 weeks for us this quarter. Procurement is heavier, but the bigger issue is more executive sign-off before deals move.",
    bullets: ["What's happening?", "Why does it matter?", "What should others pay attention to?"],
  },
  request: {
    label: "Hiring",
    description: "Need to fill a role, sharpen a hiring brief, or evaluate a candidate.",
    titlePlaceholder: "What role are you hiring for?",
    bodyPrompt: "Help others understand the context of the hire.",
    bodyExample:
      "Example: Need a VP Product for a 50-person fintech. Remote EU ok. Must have scaled 0→1 products before. Unsure about equity vs cash split.",
    bullets: [
      "Company stage and size",
      "Scope of the role",
      "What success looks like",
      "What you're unsure about",
    ],
  },
  update: {
    label: "Fundraising",
    description: "Raising capital, shaping the narrative, or evaluating terms.",
    titlePlaceholder: "What fundraising question are you working through?",
    bodyPrompt: "Share your current situation and what you're deciding.",
    bodyExample:
      "Example: Preparing for a Series C and trying to position clinical risk without killing momentum. Strong science, but timeline variance is real. Need help on framing downside vs mitigation.",
    bullets: ["Stage and round", "What you're optimizing for", "Where you're getting stuck"],
  },
};

export default function GroupDetailPage({ params }: PageProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [groupId, setGroupId] = useState<string | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [requestTitle, setRequestTitle] = useState("");
  const [requestContent, setRequestContent] = useState("");
  const [requestKind, setRequestKind] = useState<GroupRequest["kind"]>("request");
  const [isPostingRequest, setIsPostingRequest] = useState(false);
  const [showAllMembers, setShowAllMembers] = useState(false);
  const [discussionSearch, setDiscussionSearch] = useState("");
  const [discussionFilter, setDiscussionFilter] = useState<"all" | "open" | "resolved">("all");

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
        throw new Error(("error" in data && data.error) || "Unable to load group");
      }

      setGroup(data as Group);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to load group");
      setGroup(null);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (groupId) void load();
  }, [groupId, load]);

  const currentUserId = session?.user?.id ?? null;
  const selectedDiscussionType = discussionTypeMeta[requestKind];
  const currentMembership = useMemo(
    () => group?.memberships.find((membership) => membership.userId === currentUserId) ?? null,
    [currentUserId, group],
  );
  const isOwner = group?.ownerId === currentUserId;
  const isActiveMember = currentMembership?.status === "active" || isOwner;
  const hasPendingAccess =
    currentMembership?.status === "pending" ||
    currentMembership?.status === "waitlist" ||
    currentMembership?.status === "invited";

  const activeMembers = useMemo(
    () => group?.memberships.filter((membership) => membership.status === "active") ?? [],
    [group],
  );

  const waitingListMembers = useMemo(
    () =>
      group?.memberships.filter((membership) =>
        membership.status === "waitlist" || membership.status === "pending" || membership.status === "invited",
      ) ?? [],
    [group],
  );
  const waitlistVoteThreshold = useMemo(
    () => Math.max(1, Math.ceil(activeMembers.length * 0.2)),
    [activeMembers.length],
  );
  const votableCandidates = useMemo(
    () => waitingListMembers.filter((membership) => membership.status === "pending"),
    [waitingListMembers],
  );

  const acceptedConversationByUserId = useMemo(() => {
    const entries = new Map<string, string>();

    group?.requests.forEach((request) => {
      request.introductions.forEach((introduction) => {
        if (
          introduction.status === "accepted" &&
          introduction.conversation &&
          currentUserId &&
          (introduction.conversation.participantOneId === currentUserId ||
            introduction.conversation.participantTwoId === currentUserId)
        ) {
          const otherParticipantId =
            introduction.conversation.participantOneId === currentUserId
              ? introduction.conversation.participantTwoId
              : introduction.conversation.participantOneId;

          entries.set(otherParticipantId, introduction.conversation.id);
        }
      });
    });

    return entries;
  }, [currentUserId, group]);

  const pinnedRequestIds = useMemo(
    () =>
      new Set(
        [...(group?.requests.filter((request) => request.pinned) ?? [])]
          .slice(0, 2)
          .map((request) => request.id),
      ),
    [group],
  );

  const orderedRequests = useMemo(() => {
    if (!group) return [];

    return [...group.requests].sort((left, right) => {
      const leftPinned = pinnedRequestIds.has(left.id) ? 1 : 0;
      const rightPinned = pinnedRequestIds.has(right.id) ? 1 : 0;

      if (leftPinned !== rightPinned) return rightPinned - leftPinned;
      if (left.replies.length !== right.replies.length) {
        return right.replies.length - left.replies.length;
      }

      const leftActivity = Math.max(
        +new Date(left.createdAt),
        ...left.replies.map((reply) => +new Date(reply.createdAt)),
      );
      const rightActivity = Math.max(
        +new Date(right.createdAt),
        ...right.replies.map((reply) => +new Date(reply.createdAt)),
      );

      return rightActivity - leftActivity;
    });
  }, [group, pinnedRequestIds]);

  const pinnedRequests = useMemo(
    () => orderedRequests.filter((request) => pinnedRequestIds.has(request.id)),
    [orderedRequests, pinnedRequestIds],
  );

  const feedRequests = useMemo(
    () => orderedRequests.filter((request) => !pinnedRequestIds.has(request.id)),
    [orderedRequests, pinnedRequestIds],
  );

  const discussionQuery = discussionSearch.trim().toLowerCase();

  const visibleOpenRequests = useMemo(
    () =>
      feedRequests.filter((request) => {
        if (request.status !== "open") return false;
        const haystack = `${discussionTitle(request)} ${request.content} ${request.outcome || ""}`.toLowerCase();
        return !discussionQuery || haystack.includes(discussionQuery);
      }),
    [discussionQuery, feedRequests],
  );

  const visibleResolvedRequests = useMemo(
    () =>
      orderedRequests.filter((request) => {
        if (request.status === "open") return false;
        const haystack = `${discussionTitle(request)} ${request.content} ${request.outcome || ""}`.toLowerCase();
        return !discussionQuery || haystack.includes(discussionQuery);
      }),
    [discussionQuery, orderedRequests],
  );

  const hasAnyDiscussions = orderedRequests.length > 0;

  const activeOpenRequests = useMemo(
    () => visibleOpenRequests.filter((request) => request.replies.length > 0),
    [visibleOpenRequests],
  );

  const newOpenRequests = useMemo(
    () => visibleOpenRequests.filter((request) => request.replies.length === 0),
    [visibleOpenRequests],
  );

  const credibilityByUserId = useMemo(() => {
    if (!group) return new Map<string, ReturnType<typeof buildCredibilityProfile>>();

    const uniqueUsers = new Map<string, DemoUser | null>();
    group.memberships.forEach((membership) => {
      uniqueUsers.set(membership.userId, membership.user || null);
    });
    group.requests.forEach((request) => {
      if (request.creatorId) uniqueUsers.set(request.creatorId, request.creator || uniqueUsers.get(request.creatorId) || null);
      request.replies.forEach((reply) => {
        uniqueUsers.set(reply.senderId, reply.sender || uniqueUsers.get(reply.senderId) || null);
      });
    });

    return new Map(
      [...uniqueUsers.entries()].map(([userId, user]) => [
        userId,
        buildCredibilityProfile(userId, [group], user || undefined),
      ]),
    );
  }, [group]);

  async function handleCreateRequest() {
    if (!group || !requestTitle.trim() || !requestContent.trim()) {
      setFlash("Add a title and context before posting");
      return;
    }

    setIsPostingRequest(true);
    setFlash(null);

    try {
      const response = await fetch("/api/requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: group.id,
          title: requestTitle.trim(),
          content: requestContent.trim(),
          kind: requestKind,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to post discussion");
      }

      setRequestTitle("");
      setRequestContent("");
      setRequestKind("request");
      setFlash("Discussion posted");
      await load();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to post discussion");
    } finally {
      setIsPostingRequest(false);
    }
  }

  async function handleOpenDirectConversation(targetUserId: string) {
    if (!group) {
      return;
    }

    setFlash(null);

    try {
      const response = await fetch("/api/conversations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          groupId: group.id,
          targetUserId,
        }),
      });

      const data = (await response.json()) as { id?: string; error?: string };

      if (!response.ok || !data.id) {
        throw new Error(data.error ?? "Unable to open conversation");
      }

      router.push(`/conversations/${data.id}`);
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to open conversation");
    }
  }

  function getFeedStatusLabel(request: GroupRequest) {
    if (request.status !== "open") return "Resolved";
    if (request.replies.length > 0) return "Active";
    return "New";
  }

  function getDiscussionPreview(request: GroupRequest) {
    const preview = request.content.replace(/\s+/g, " ").trim();
    return preview.length > 120 ? `${preview.slice(0, 117)}...` : preview;
  }

  function renderDiscussionRows(
    requests: GroupRequest[],
    label: string,
    emptyCopy: string,
    groupSlug: string,
    previewFirstTwo = false,
  ) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">{label}</h3>
          <span className="text-xs text-muted">{requests.length}</span>
        </div>

        {!requests.length ? <p className="text-sm text-muted">{emptyCopy}</p> : null}

        {requests.map((request, index) => {
          const lastActivity = request.replies.at(-1)?.createdAt || request.createdAt;
          const statusLabel = getFeedStatusLabel(request);
          const replyLabel =
            request.replies.length === 0
              ? "0 replies"
              : `${request.replies.length} repl${request.replies.length === 1 ? "y" : "ies"}`;

          return (
            <Link
              key={`${label}-${request.id}`}
              href={`/groups/${groupSlug}/discussions/${request.id}`}
              className="block border-b border-line/70 py-3 transition hover:bg-stone-50/60"
            >
              <p className="text-[15px] font-medium leading-6 text-foreground">{discussionTitle(request)}</p>
              {previewFirstTwo && index < 2 ? (
                <p className="mt-1 text-sm leading-6 text-muted">{getDiscussionPreview(request)}</p>
              ) : null}
              <p className="mt-1.5 text-sm text-muted">
                {replyLabel} · {statusLabel} · {formatRelativeMoment(lastActivity).replace("Last activity ", "")}
              </p>
            </Link>
          );
        })}
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2">
            <Link href="/" className="text-sm font-medium text-muted transition hover:text-foreground">
              Back to dashboard
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight">{group?.name || "Loading group..."}</h1>
              {group ? (
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClasses[group.status]}`}>
                  {statusCopy[group.status]}
                </span>
              ) : null}
            </div>
            <p className="max-w-3xl text-base text-muted">{group?.description || "No description added yet."}</p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium transition hover:border-foreground"
          >
            Refresh
          </button>
        </div>

        {group && currentUserId && (group.ownerId === currentUserId || currentUserId === "temp-user") ? (
          <div className="flex justify-end">
            <Link
              href={`/owner/groups/${group.id}`}
              className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground"
            >
              Open owner dashboard
            </Link>
          </div>
        ) : null}

        {flash ? <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">{flash}</div> : null}

        {!loading && !group ? (
          <div className="rounded-3xl border border-line bg-panel p-8 text-sm text-muted">
            This group is not visible to the current user.
          </div>
        ) : null}

        {group ? (
          <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
            <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
              <div className="rounded-2xl border border-line bg-white p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  Curated by {group.owner?.name || group.owner?.email || group.ownerId}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Members are expected to contribute context, not opinions.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {isActiveMember ? (
                    <button
                      type="button"
                      onClick={() =>
                        document.getElementById("ask-in-group")?.scrollIntoView({ behavior: "smooth", block: "start" })
                      }
                      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Start a discussion
                    </button>
                  ) : (
                    <Link
                      href={currentUserId ? `/groups/${group.id}/apply` : "/"}
                      className={`rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 ${
                        hasPendingAccess ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {!currentUserId
                        ? "Sign in to apply"
                        : hasPendingAccess
                          ? "Application in review"
                          : "Apply to join"}
                    </Link>
                  )}
                  {isActiveMember ? (
                    <Link
                      href={`/groups/${group.id}/votes`}
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                    >
                      Member votes
                    </Link>
                  ) : null}
                  <span className="rounded-full bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
                    {group.requests.filter((request) => request.status === "open").length} active topics
                  </span>
                </div>
                {!isActiveMember ? (
                  <p className="mt-4 text-sm text-muted">
                    Members can join up to 4 rooms. Apply with context and contribution, then active members can recommend strong applicants into voting.
                  </p>
                ) : null}
              </div>

              {isActiveMember ? (
                <div id="ask-in-group" className="mt-5 rounded-2xl border border-line bg-white p-5">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Discussions</h2>
                    <p className="text-sm text-muted">
                      Bring a real decision, tradeoff, or pattern the room can sharpen quickly.
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {!hasAnyDiscussions ? (
                      <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                        <p className="text-sm font-medium text-foreground">Start with the first real question.</p>
                        <p className="mt-2 text-sm text-muted">
                          The fastest way to make a new room feel alive is to post one concrete decision with real context. Good first threads usually ask for help on a hire, a tradeoff, a live fundraising question, or a pattern you want the room to pressure-test.
                        </p>
                      </div>
                    ) : null}
                    <p className="text-sm font-medium">Share with the group</p>
                    <p className="text-sm text-muted">Clear context leads to better replies.</p>
                    <p className="text-sm text-muted">
                      {selectedDiscussionType.bodyExample}
                    </p>
                    <div className="grid gap-3 md:grid-cols-[1fr_0.6fr]">
                      <input
                        className="rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                        value={requestTitle}
                        onChange={(event) => setRequestTitle(event.target.value)}
                        placeholder={selectedDiscussionType.titlePlaceholder}
                      />
                      <label className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                          Discussion type
                        </span>
                        <select
                          className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                          value={requestKind}
                          onChange={(event) => setRequestKind(event.target.value as GroupRequest["kind"])}
                        >
                          <option value="question">Question</option>
                          <option value="insight">Insight</option>
                          <option value="request">Hiring</option>
                          <option value="update">Fundraising</option>
                        </select>
                        <p className="text-xs text-muted">{selectedDiscussionType.description}</p>
                      </label>
                    </div>
                    <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                      <p className="text-sm font-medium text-foreground">{selectedDiscussionType.label}</p>
                      <p className="mt-2 text-sm text-muted">{selectedDiscussionType.bodyPrompt}</p>
                      <div className="mt-3 space-y-1 text-sm text-muted">
                        {selectedDiscussionType.bullets.map((bullet) => (
                          <p key={bullet}>• {bullet}</p>
                        ))}
                      </div>
                    </div>
                    <textarea
                      className="min-h-32 w-full rounded-2xl border border-line bg-panel px-4 py-3 text-sm outline-none transition focus:border-foreground"
                      value={requestContent}
                      onChange={(event) => setRequestContent(event.target.value)}
                      placeholder={selectedDiscussionType.bodyExample}
                    />
                    <button
                      type="button"
                      onClick={() => void handleCreateRequest()}
                      disabled={isPostingRequest || !currentUserId}
                      className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isPostingRequest ? "Posting..." : "Share with the room"}
                    </button>
                  </div>
                </div>
              ) : (
                <div id="ask-in-group" className="mt-5 rounded-2xl border border-line bg-white p-5">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold">Discussions</h2>
                    <p className="text-sm text-muted">
                      This room opens up once you are an active member. Public discussion comes first, then private follow-up if useful.
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-line bg-white p-5">
                <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted">Pinned topics</h3>
                <div className="mt-3 space-y-3">
                  {!pinnedRequests.filter((request) => request.status === "open").length ? (
                    <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-4 text-sm text-muted">
                      Nothing is pinned yet. Once a discussion becomes central to the room, it can live here.
                    </div>
                  ) : null}
                  {pinnedRequests
                    .filter((request) => request.status === "open")
                    .slice(0, 2)
                    .map((request) => (
                      <div key={`pinned-${request.id}`} className="rounded-2xl border border-line bg-panel px-4 py-3">
                        <p className="font-medium">{discussionTitle(request)}</p>
                        <p className="mt-1 text-sm text-muted">
                          {request.replies.length} repl{request.replies.length === 1 ? "y" : "ies"} · {formatRelativeMoment(request.replies.at(-1)?.createdAt || request.createdAt)}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              <div className="mt-5 space-y-5">
                <div className="rounded-2xl border border-line bg-white p-5">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <label className="block flex-1 space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
                        Search discussions
                      </span>
                      <input
                        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none transition focus:border-foreground"
                        value={discussionSearch}
                        onChange={(event) => setDiscussionSearch(event.target.value)}
                        placeholder="Search active and resolved discussions..."
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { key: "all", label: "All" },
                        { key: "open", label: "Open" },
                        { key: "resolved", label: "Resolved" },
                      ].map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() => setDiscussionFilter(option.key as "all" | "open" | "resolved")}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            discussionFilter === option.key
                              ? "bg-foreground text-white"
                              : "border border-line text-foreground hover:border-foreground"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {(discussionFilter === "all" || discussionFilter === "open") ? (
                  <div className="rounded-2xl border border-line bg-white p-5">
                    {!hasAnyDiscussions ? (
                      <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-5 text-sm text-muted">
                        <p className="font-medium text-foreground">No discussions yet.</p>
                        <p className="mt-1">
                          This room is ready for its first real thread. Start with a concrete decision where strong context will produce a strong reply.
                        </p>
                      </div>
                    ) : null}
                    <div className="space-y-6">
                      {renderDiscussionRows(
                        activeOpenRequests,
                        "Active",
                        "No active discussions yet. The first one will show here once replies start moving.",
                        group.id,
                        true,
                      )}
                      {renderDiscussionRows(
                        newOpenRequests,
                        "New",
                        "No new discussions waiting yet.",
                        group.id,
                      )}
                    </div>
                  </div>
                ) : null}

                {(discussionFilter === "all" || discussionFilter === "resolved") ? (
                  <div className="rounded-2xl border border-line bg-white p-5">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold">Resolved discussions</h3>
                      <p className="text-sm text-muted">Decisions and outcomes from past discussions.</p>
                    </div>
                    <div className="mt-4">
                      {renderDiscussionRows(
                        visibleResolvedRequests,
                        "Resolved",
                        "No resolved discussions yet. The first one will show here once marked complete.",
                        group.id,
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </section>
            <aside className="space-y-6">
              <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Members · {activeMembers.length} of 50</h2>
                <p className="mt-1 text-sm text-muted">People in this room who are expected to add operating context, not generic takes.</p>

                <div className="mt-5 space-y-3">
                  {(showAllMembers ? activeMembers : activeMembers.slice(0, 10)).map((membership) => {
                    const contributionCount = group.requests.reduce((count, request) => {
                      const replyCount = request.replies.filter((reply) => reply.senderId === membership.userId).length;
                      const introCount = request.introductions.filter((introduction) => introduction.connectorId === membership.userId).length;
                      return count + replyCount + introCount;
                    }, 0);
                    const conversationId = acceptedConversationByUserId.get(membership.userId);
                    const isNewMember = Date.now() - new Date(membership.createdAt).getTime() < 14 * 24 * 60 * 60 * 1000;
                    const credibility = credibilityByUserId.get(membership.userId);

                    return (
                      <div key={membership.id} className="rounded-2xl border border-line bg-white px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xs font-semibold text-stone-700">
                              {memberInitials(membership.user?.name, membership.user?.email)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-medium">{membership.user?.name || membership.user?.email || membership.userId}</p>
                                {isNewMember ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">New</span> : null}
                                {credibility ? (
                                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${trustBadgeClasses(credibility.trustLevel)}`}>
                                    {credibility.trustLevel}
                                  </span>
                                ) : null}
                              </div>
                              <p className="truncate text-sm text-muted">{membership.user?.headline || membership.role}</p>
                              {credibility?.knownFor.length ? (
                                <p className="mt-1 truncate text-xs text-muted">Known for {credibility.knownFor.slice(0, 2).join(" · ")}</p>
                              ) : null}
                              {showAllMembers ? (
                                <>
                                  <p className="mt-1 text-xs text-muted">Member since {formatJoinedLabel(membership.createdAt)}</p>
                                  <p className="mt-1 text-xs text-muted">
                                    {credibility?.replyCountRecent
                                      ? `${credibility.replyCountRecent} ${credibility.replyCountRecent === 1 ? "reply" : "replies"} this week`
                                      : contributionCount >= 3
                                        ? "Active contributor"
                                        : contributionCount >= 1
                                          ? `${contributionCount} ${contributionCount === 1 ? "reply" : "replies"} this week`
                                          : "Quiet lately"}
                                  </p>
                                </>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end gap-2">
                            {showAllMembers ? (
                              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-medium text-stone-700">
                                {getMemberActivityLabel(contributionCount)}
                              </span>
                            ) : null}
                            <div className="flex flex-wrap justify-end gap-2">
                              {conversationId ? (
                                <Link href={`/conversations/${conversationId}`} className="text-xs font-medium text-muted transition hover:text-foreground">Message</Link>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void handleOpenDirectConversation(membership.userId)}
                                  className="text-xs font-medium text-muted transition hover:text-foreground"
                                >
                                  Message
                                </button>
                              )}
                              <Link
                                href={`/members/${membership.userId}`}
                                className="text-xs font-medium text-muted transition hover:text-foreground"
                              >
                                View profile
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {activeMembers.length > 10 ? (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => setShowAllMembers((current) => !current)}
                        className="w-full rounded-2xl border border-dashed border-line bg-white px-4 py-3 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground"
                      >
                        {showAllMembers ? "Show fewer members" : `See all ${activeMembers.length} members`}
                      </button>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Waiting list · {waitingListMembers.length}</h2>
                <p className="mt-1 text-sm text-muted">
                  Access opens selectively. New members need support from at least 20% of active members before they get in.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Right now that means {waitlistVoteThreshold} {waitlistVoteThreshold === 1 ? "member vote" : "member votes"}. Queued candidates need to be recommended into active voting first.
                </p>
                {isActiveMember && votableCandidates.length ? (
                  <Link
                    href={`/groups/${group.id}/votes`}
                    className="mt-3 inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                  >
                    Review {votableCandidates.length} candidate{votableCandidates.length === 1 ? "" : "s"}
                  </Link>
                ) : null}

                <div className="mt-5 space-y-3">
                  {!waitingListMembers.length ? (
                    <p className="text-sm text-muted">
                      No one is waiting yet. Once people apply, this queue becomes the room&apos;s intake.
                    </p>
                  ) : null}

                  {waitingListMembers.slice(0, 6).map((membership) => (
                    <div key={membership.id} className="rounded-2xl border border-line bg-white px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">
                            {membership.user?.name || membership.user?.email || membership.userId}
                          </p>
                          <p className="mt-1 truncate text-sm text-muted">
                            {membership.user?.headline || "Prospective member"}
                          </p>
                          {membership.recommendedBy ? (
                            <p className="mt-1 text-xs text-foreground">
                              Recommended by {membership.recommendedBy.name || membership.recommendedBy.email}
                            </p>
                          ) : null}
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-medium text-foreground">
                            {membership.status === "pending"
                              ? `${membership.votes?.length ?? 0}/${waitlistVoteThreshold} votes · Active voting`
                              : "Queued · Needs recommendation"}
                          </p>
                          <p className="mt-1 text-xs text-muted">{formatJoinedLabel(membership.createdAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {waitingListMembers.length > 6 ? (
                    <div className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">
                      {waitingListMembers.length - 6} more people are waiting for review.
                    </div>
                  ) : null}
                </div>
              </section>
            </aside>
          </div>
        ) : null}
      </div>
    </main>
  );
}


