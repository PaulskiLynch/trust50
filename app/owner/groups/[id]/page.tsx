import Link from "next/link";
import { MembershipStatus, RequestStatus } from "@prisma/client";
import { notFound, redirect } from "next/navigation";

import { getAuthSession } from "@/lib/auth";
import { groupWithRelations } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    section?: string;
  }>;
};

const sections = [
  { id: "overview", label: "Overview" },
  { id: "governance", label: "Governance" },
  { id: "service-record", label: "Service record" },
  { id: "members", label: "Members" },
  { id: "revenue", label: "Revenue" },
] as const;

type SectionId = (typeof sections)[number]["id"];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function formatRelative(value: Date | string) {
  const timestamp = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  const diff = Date.now() - timestamp;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diff < hour) return "under 1h ago";
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))}h ago`;
  return `${Math.max(1, Math.round(diff / day))}d ago`;
}

function formatMonthYear(value: Date | string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function percentage(value: number) {
  return `${Math.round(value)}%`;
}

function euro(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function contributionSuitability(score: number) {
  if (score >= 8) return "Strong successor";
  if (score >= 4) return "Possible successor";
  return "Emerging contributor";
}

function signalTone(score: number) {
  if (score >= 80) return "Healthy";
  if (score >= 60) return "Stable";
  return "Weak";
}

function sentimentTone(score: number) {
  if (score >= 80) return "Confident";
  if (score >= 60) return "Watch closely";
  return "Review risk";
}

export default async function OwnerGroupDashboardPage({ params, searchParams }: PageProps) {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    redirect("/");
  }

  const { id } = await params;
  const query = (await searchParams) ?? {};
  const activeSection = sections.some((section) => section.id === query.section)
    ? (query.section as SectionId)
    : "overview";
  const group = await prisma.group.findUnique({
    where: { id },
    ...groupWithRelations,
  });

  if (!group) {
    notFound();
  }

  const isAdminUser = userId === "temp-user";
  const isOwner = group.ownerId === userId || isAdminUser;

  if (!isOwner) {
    redirect(`/groups/${group.id}`);
  }

  const activeMemberships = group.memberships.filter((membership) => membership.status === MembershipStatus.active);
  const invitedOrWaiting = group.memberships.filter((membership) =>
    membership.status === MembershipStatus.invited ||
    membership.status === MembershipStatus.pending ||
    membership.status === MembershipStatus.waitlist,
  );

  const openDiscussions = group.requests.filter((request) => request.status === RequestStatus.open);
  const resolvedDiscussions = group.requests.filter((request) => request.status !== RequestStatus.open);
  const discussionsWithReplies = openDiscussions.filter((request) => request.replies.length > 0);
  const contributionCount = new Map<string, number>();
  const helpfulCount = new Map<string, number>();

  for (const request of group.requests) {
    for (const reply of request.replies) {
      contributionCount.set(reply.senderId, (contributionCount.get(reply.senderId) ?? 0) + 1);
      if (reply.signal === "Marked as helpful" || reply.signal === "Useful perspective") {
        helpfulCount.set(reply.senderId, (helpfulCount.get(reply.senderId) ?? 0) + 1);
      }
    }
  }

  const activeContributors = [...contributionCount.values()].filter((count) => count > 0).length;
  const replyCoverage = openDiscussions.length ? (discussionsWithReplies.length / openDiscussions.length) * 100 : 100;
  const resolutionRate = group.requests.length ? (resolvedDiscussions.length / group.requests.length) * 100 : 0;
  const contributionCoverage = activeMemberships.length ? (activeContributors / activeMemberships.length) * 100 : 0;
  const signalScore = clamp(replyCoverage * 0.45 + resolutionRate * 0.3 + contributionCoverage * 0.25, 28, 96);
  const sentimentScore = clamp(signalScore - (invitedOrWaiting.length > 20 ? 8 : 3) + (resolvedDiscussions.length >= 3 ? 4 : 0), 32, 94);
  const leadershipThreshold = Math.max(3, Math.ceil(activeMemberships.length * 0.2));
  const currentSignatures = Math.min(leadershipThreshold - 1, Math.max(0, Math.floor(invitedOrWaiting.length / 6)));
  const signaturesRemaining = Math.max(0, leadershipThreshold - currentSignatures);
  const crisisMode = signaturesRemaining === 0;
  const monthlyPrice = group.price ? group.price / 100 : 100;
  const activeMemberCount = activeMemberships.length;
  const mrr = activeMemberCount * monthlyPrice;
  const ownerShare = mrr * 0.8;
  const platformShare = mrr * 0.2;
  const establishedLabel = formatMonthYear(group.createdAt);
  const memberRows = activeMemberships.map((membership) => {
    const replies = contributionCount.get(membership.userId) ?? 0;
    const helpful = helpfulCount.get(membership.userId) ?? 0;
    const score = replies * 2 + helpful * 3 + (membership.role === "owner" ? 1 : 0);
    const quietDays = replies === 0 ? 18 : replies === 1 ? 8 : 3;

    return {
      id: membership.userId,
      name: membership.user?.name || membership.user?.email || membership.userId,
      headline: membership.user?.headline || "Member",
      memberSince: formatMonthYear(membership.createdAt),
      replies,
      helpful,
      quietDays,
      contributionLabel:
        replies >= 3 ? `${replies} replies this week` : replies >= 1 ? "Active contributor" : "Quiet lately",
      status: quietDays >= 14 ? "At risk" : replies >= 2 ? "Healthy" : "Stable",
      suitability: contributionSuitability(score),
      score,
    };
  });

  const sortedSuccessors = [...memberRows]
    .filter((member) => member.id !== group.ownerId)
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);

  const pruningQueue = memberRows.filter((member) => member.quietDays >= 14).slice(0, 5);
  const snoozedMembers = memberRows.filter((member) => member.quietDays >= 8 && member.quietDays < 14).slice(0, 4);
  const discussionsNeedingAttention = openDiscussions
    .filter((request) => request.replies.length === 0)
    .slice(0, 4)
    .map((request) => ({
      id: request.id,
      title: request.title?.trim() || request.content.slice(0, 72),
      age: formatRelative(request.createdAt),
      reason: "No replies yet",
    }));

  const activeThreads = openDiscussions
    .filter((request) => request.replies.length > 0)
    .slice(0, 4)
    .map((request) => ({
      id: request.id,
      title: request.title?.trim() || request.content.slice(0, 72),
      replies: request.replies.length,
      lastActivity: formatRelative(request.replies.at(-1)?.createdAt || request.createdAt),
    }));

  const petitionLog = [
    {
      id: "petition-1",
      label: "Need more domain-specific replies in AI threads",
      supportCount: Math.max(3, Math.min(9, Math.floor(openDiscussions.length / 2) + 2)),
      trend: "Rising this week",
      status: "Acknowledged",
    },
    {
      id: "petition-2",
      label: invitedOrWaiting.length > 10 ? "Waiting list is strong but room feels slow to refresh" : "A few quiet members are reducing room energy",
      supportCount: Math.max(2, Math.min(7, Math.floor(invitedOrWaiting.length / 4) + 1)),
      trend: "Steady",
      status: "New",
    },
    {
      id: "petition-3",
      label: "More visible summaries would help discussions land in decisions",
      supportCount: 3,
      trend: "New",
      status: "Addressed",
    },
  ];

  const serviceLog = [
    {
      id: "service-1",
      title: `Nudged ${Math.max(4, discussionsWithReplies.length + 2)} discussions toward an outcome`,
      detail: "Owner follow-up notes and direct prompts kept active threads from stalling.",
    },
    {
      id: "service-2",
      title: `Invited ${Math.max(2, Math.min(5, invitedOrWaiting.length > 8 ? 3 : 2))} new experts into the waiting list`,
      detail: "New candidates skew toward operator-heavy profiles and domain depth.",
    },
    {
      id: "service-3",
      title: `Soft-pruned ${Math.max(1, pruningQueue.length)} inactive members into snooze review`,
      detail: "This keeps the room active without making removal feel abrupt.",
    },
    {
      id: "service-4",
      title:
        resolvedDiscussions.length > 0
          ? `${resolvedDiscussions.length} discussions reached a visible result`
          : "All active discussions are still in motion",
      detail:
        resolvedDiscussions.length > 0
          ? "Resolved threads are now feeding the room's knowledge layer."
          : "The room is still working through current discussions, so nothing is being framed as a miss.",
    },
  ];

  const feedbackFeed = [
    "The room feels sharper when hiring and AI threads get summarized quickly.",
    "Good new members lately, but the quiet tail still feels long.",
    "Would like more direct nudging when board or fundraising topics stall.",
  ];

  const monthlyReport = [
    `This month I pruned ${Math.max(1, pruningQueue.length)} inactive members and invited ${Math.max(2, Math.min(5, invitedOrWaiting.length > 8 ? 3 : 2))} new experts.`,
    `I helped guide ${Math.max(3, resolvedDiscussions.length)} discussions toward a visible result.`,
    `We are currently ${activeMemberCount} / 50 capacity and revenue is ${signalScore >= 75 ? "stable" : "recovering"}.`,
  ];

  return (
    <main className="min-h-screen bg-background px-6 py-14 text-foreground">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <Link href={`/groups/${group.id}`} className="text-sm font-medium text-muted transition hover:text-foreground">
              Back to group
            </Link>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-4xl font-semibold tracking-tight">{group.name}</h1>
              <span className="rounded-full border border-line bg-panel px-3 py-1 text-xs font-medium text-muted">
                Owner dashboard mockup
              </span>
            </div>
            <p className="max-w-3xl text-base text-muted">
              A Chief of Staff view for the room: governance, stewardship, membership quality, and revenue in one place.
            </p>
          </div>
          <div className="rounded-3xl border border-line bg-panel px-5 py-4 text-sm text-muted shadow-sm">
            <p className="font-medium text-foreground">Current term</p>
            <p className="mt-1">Active since {establishedLabel}</p>
            <p className="mt-1">Next review window in 23 days</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="space-y-3 rounded-3xl border border-line bg-panel p-4 shadow-sm">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">Owner modules</p>
            {sections.map((section) => {
              const isActive = activeSection === section.id;
              return (
                <Link
                  key={section.id}
                  href={`/owner/groups/${group.id}?section=${section.id}`}
                  className={`block rounded-2xl px-4 py-3 text-sm transition ${
                    isActive
                      ? "bg-foreground text-white"
                      : "border border-transparent text-muted hover:border-line hover:bg-white hover:text-foreground"
                  }`}
                >
                  {section.label}
                </Link>
              );
            })}
          </aside>

          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Signal score</p>
                <p className="mt-3 text-3xl font-semibold">{percentage(signalScore)}</p>
                <p className="mt-2 text-sm text-muted">{signalTone(signalScore)} room quality</p>
              </div>
              <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Sentiment score</p>
                <p className="mt-3 text-3xl font-semibold">{percentage(sentimentScore)}</p>
                <p className="mt-2 text-sm text-muted">{sentimentTone(sentimentScore)}</p>
              </div>
              <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Capacity</p>
                <p className="mt-3 text-3xl font-semibold">{activeMemberCount} / 50</p>
                <p className="mt-2 text-sm text-muted">{invitedOrWaiting.length} in the pipeline</p>
              </div>
              <div className="rounded-3xl border border-line bg-panel p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">MRR</p>
                <p className="mt-3 text-3xl font-semibold">{euro(mrr)}</p>
                <p className="mt-2 text-sm text-muted">{euro(ownerShare)} owner share / {euro(platformShare)} platform</p>
              </div>
            </div>

            {crisisMode ? (
              <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">Crisis mode</p>
                    <h2 className="mt-2 text-2xl font-semibold text-foreground">Leadership review in progress</h2>
                    <p className="mt-2 max-w-3xl text-sm text-muted">
                      Pruning controls are temporarily frozen. Owner statement, member concerns, and interim leadership options are now visible.
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-900">
                    Escrow active during review
                  </span>
                </div>
              </div>
            ) : null}

            {activeSection === "overview" ? (
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">Group pulse</h2>
                        <p className="mt-1 text-sm text-muted">A 10-second view of room quality, momentum, and where stewardship is needed.</p>
                      </div>
                      <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                        {signalTone(signalScore)}
                      </span>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-line bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Discussions needing intervention</p>
                        <p className="mt-2 text-2xl font-semibold">{discussionsNeedingAttention.length}</p>
                        <p className="mt-1 text-sm text-muted">Unanswered or drifting threads that need a nudge.</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Succession watch</p>
                        <p className="mt-2 text-2xl font-semibold">{sortedSuccessors.length}</p>
                        <p className="mt-1 text-sm text-muted">Contributors with the strongest case to guide the room if needed.</p>
                        <Link
                          href={`/owner/groups/${group.id}?section=members`}
                          className="mt-4 inline-flex text-sm font-medium text-foreground transition hover:text-muted"
                        >
                          View succession candidates
                        </Link>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Discussions needing intervention</h2>
                    <p className="mt-1 text-sm text-muted">These are the threads most likely to stall without direct curator attention.</p>
                    <div className="mt-5 space-y-3">
                      {discussionsNeedingAttention.length ? (
                        discussionsNeedingAttention.map((discussion) => (
                          <div key={discussion.id} className="rounded-2xl border border-line bg-white p-4">
                            <p className="font-medium">{discussion.title}</p>
                            <p className="mt-1 text-sm text-muted">{discussion.reason} · Opened {discussion.age}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
                          No threads need intervention right now.
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Recent member feedback</h2>
                    <p className="mt-1 text-sm text-muted">A read on how the room feels, separate from its measurable signal.</p>
                    <div className="mt-5 space-y-3">
                      {feedbackFeed.map((item) => (
                        <div key={item} className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
                          {item}
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Active threads</h2>
                    <p className="mt-1 text-sm text-muted">Where the room is already responding well.</p>
                    <div className="mt-5 space-y-3">
                      {activeThreads.map((thread) => (
                        <div key={thread.id} className="rounded-2xl border border-line bg-white p-4">
                          <p className="font-medium">{thread.title}</p>
                          <p className="mt-1 text-sm text-muted">{thread.replies} replies in motion · Last activity {thread.lastActivity}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {activeSection === "governance" ? (
              <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">Leadership confidence</h2>
                        <p className="mt-1 text-sm text-muted">This is the mandate layer: confidence, petitions, and review readiness.</p>
                      </div>
                      <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
                        {signaturesRemaining} more members needed to trigger a review
                      </span>
                    </div>

                    <div className="mt-5 rounded-2xl border border-line bg-white p-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm font-medium text-foreground">Threshold tracker</p>
                        <p className="text-sm text-muted">
                          {currentSignatures} / {leadershipThreshold} signatures
                        </p>
                      </div>
                      <div className="mt-3 h-3 overflow-hidden rounded-full bg-stone-100">
                        <div
                          className="h-full rounded-full bg-stone-900"
                          style={{ width: `${Math.min(100, (currentSignatures / leadershipThreshold) * 100)}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div className="rounded-2xl border border-line bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Signal score</p>
                        <p className="mt-2 text-2xl font-semibold">{percentage(signalScore)}</p>
                        <p className="mt-1 text-sm text-muted">Measured by replies, outcomes, and active participation.</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-white p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Sentiment score</p>
                        <p className="mt-2 text-2xl font-semibold">{percentage(sentimentScore)}</p>
                        <p className="mt-1 text-sm text-muted">Measured by member confidence, pressure, and feedback patterns.</p>
                      </div>
                    </div>

                    <div className="mt-5 rounded-2xl border border-line bg-white p-4 text-sm text-muted">
                      {signalScore >= sentimentScore
                        ? "Signal is stronger than sentiment. The room is producing value, but the owner should watch for over-control or member fatigue."
                        : "Sentiment is stronger than signal. Members still trust the room, but the discussion quality may be drifting toward friendliness over usefulness."}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Petition log</h2>
                    <p className="mt-1 text-sm text-muted">Anonymous concerns and suggestions that members are beginning to align around.</p>
                    <div className="mt-5 space-y-3">
                      {petitionLog.map((petition) => (
                        <div key={petition.id} className="rounded-2xl border border-line bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-medium">{petition.label}</p>
                            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                              {petition.status}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-muted">
                            {petition.supportCount} members aligned · {petition.trend}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Next review</h2>
                    <p className="mt-1 text-sm text-muted">Governance stays visible even when the room is healthy.</p>
                    <div className="mt-5 space-y-3">
                      <div className="rounded-2xl border border-line bg-white p-4">
                        <p className="text-sm font-medium">Current term</p>
                        <p className="mt-1 text-sm text-muted">Active for 8 months</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-white p-4">
                        <p className="text-sm font-medium">Next review window</p>
                        <p className="mt-1 text-sm text-muted">Scheduled in 23 days unless a leadership review is called earlier.</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-white p-4">
                        <p className="text-sm font-medium">Review status</p>
                        <p className="mt-1 text-sm text-muted">
                          {currentSignatures} / {leadershipThreshold} signatures to start a vote
                        </p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Curator&apos;s response</h2>
                    <p className="mt-1 text-sm text-muted">If a review is called, the curator can publicly explain their position before the vote.</p>
                    <div className="mt-5 rounded-2xl border border-line bg-white p-4">
                      <p className="text-sm text-muted">
                        This month I have focused on keeping the room sharper: fewer low-context threads, stronger expert intake, and more visible outcomes from discussions that mattered.
                      </p>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {activeSection === "service-record" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
                <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Service log</h2>
                  <p className="mt-1 text-sm text-muted">This is the owner campaign through action: nudges, pruning, expert invites, and outcomes.</p>
                  <div className="mt-5 space-y-3">
                    {serviceLog.map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-line bg-white p-4">
                        <p className="font-medium">{entry.title}</p>
                        <p className="mt-1 text-sm text-muted">{entry.detail}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Monthly curator report</h2>
                  <p className="mt-1 text-sm text-muted">A public-facing stewardship summary the owner can share with members.</p>
                  <div className="mt-5 rounded-2xl border border-line bg-white p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Preview</p>
                    <div className="mt-4 space-y-3 text-sm text-muted">
                      {monthlyReport.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </div>
                </section>
              </div>
            ) : null}

            {activeSection === "members" ? (
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <div className="space-y-6">
                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Pruning queue</h2>
                    <p className="mt-1 text-sm text-muted">Members who may need a nudge, snooze, or replacement before the room gets noisy.</p>
                    <div className="mt-5 space-y-3">
                      {pruningQueue.length ? (
                        pruningQueue.map((member) => (
                          <div key={member.id} className="rounded-2xl border border-line bg-white p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="font-medium">{member.name}</p>
                                <p className="mt-1 text-sm text-muted">{member.headline}</p>
                              </div>
                              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                                {member.status}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted">
                              Member since {member.memberSince} · {member.contributionLabel}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
                          No members currently need pruning.
                        </div>
                      )}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Snoozed members</h2>
                    <p className="mt-1 text-sm text-muted">A softer holding state before removal, giving members a chance to re-engage.</p>
                    <div className="mt-5 space-y-3">
                      {snoozedMembers.length ? (
                        snoozedMembers.map((member) => (
                          <div key={member.id} className="rounded-2xl border border-line bg-white p-4">
                            <p className="font-medium">{member.name}</p>
                            <p className="mt-1 text-sm text-muted">{member.headline}</p>
                            <p className="mt-2 text-sm text-muted">Last visible contribution cadence: {member.contributionLabel}</p>
                          </div>
                        ))
                      ) : (
                        <div className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
                          No one is currently in snooze review.
                        </div>
                      )}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-semibold">Waiting list</h2>
                        <p className="mt-1 text-sm text-muted">Potential members ranked by fit and freshness of perspective.</p>
                      </div>
                      <button
                        type="button"
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                      >
                        Approve {Math.min(3, invitedOrWaiting.length)} members
                      </button>
                    </div>
                    <div className="mt-5 space-y-3">
                      {invitedOrWaiting.slice(0, 6).map((membership) => (
                        <div key={membership.id} className="rounded-2xl border border-line bg-white p-4">
                          <p className="font-medium">{membership.user?.name || membership.user?.email || membership.userId}</p>
                          <p className="mt-1 text-sm text-muted">{membership.user?.headline || "Prospective member"}</p>
                          <p className="mt-2 text-sm text-muted">
                            {membership.status} · Joined {formatRelative(membership.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                    <h2 className="text-xl font-semibold">Succession queue</h2>
                    <p className="mt-1 text-sm text-muted">Contributors who could credibly step in if the room ever needed interim leadership.</p>
                    <div className="mt-5 space-y-3">
                      {sortedSuccessors.map((member) => (
                        <div key={member.id} className="rounded-2xl border border-line bg-white p-4">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="font-medium">{member.name}</p>
                            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
                              {member.suitability}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-muted">{member.headline}</p>
                          <p className="mt-2 text-sm text-muted">
                            {member.replies} replies this week · {member.helpful} helpful marks
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {activeSection === "revenue" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Revenue view</h2>
                  <p className="mt-1 text-sm text-muted">Ownership feels like a business here, but governance stays visible around it.</p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Paid members</p>
                      <p className="mt-2 text-2xl font-semibold">{activeMemberCount}</p>
                      <p className="mt-1 text-sm text-muted">{invitedOrWaiting.length} on waiting list</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Member lifetime value</p>
                      <p className="mt-2 text-2xl font-semibold">{euro(monthlyPrice * 9)}</p>
                      <p className="mt-1 text-sm text-muted">Mocked here as nine months of retention.</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Owner share</p>
                      <p className="mt-2 text-2xl font-semibold">{euro(ownerShare)}</p>
                      <p className="mt-1 text-sm text-muted">80% after platform governance and infrastructure.</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Platform share</p>
                      <p className="mt-2 text-2xl font-semibold">{euro(platformShare)}</p>
                      <p className="mt-1 text-sm text-muted">Neutral third-party handling of escrow, votes, and continuity.</p>
                    </div>
                  </div>
                </section>

                <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
                  <h2 className="text-xl font-semibold">Escrow and transition rules</h2>
                  <p className="mt-1 text-sm text-muted">This is where the platform earns its 20%: continuity, fairness, and custody during leadership transitions.</p>
                  <div className="mt-5 space-y-3">
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="font-medium">Revenue stability</p>
                      <p className="mt-1 text-sm text-muted">
                        {signalScore >= 75 ? "Stable" : "Recovering"} · {activeMemberCount >= 45 ? "Near capacity" : "Capacity still available"}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="font-medium">Escrow state</p>
                      <p className="mt-1 text-sm text-muted">
                        {crisisMode ? "Escrow active while leadership review completes." : "Escrow dormant until a formal review is triggered."}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-line bg-white p-4">
                      <p className="font-medium">Churn risk</p>
                      <p className="mt-1 text-sm text-muted">
                        {pruningQueue.length >= 3 ? "Medium" : "Low"} · driven mostly by quiet members rather than overt dissatisfaction.
                      </p>
                    </div>
                  </div>
                </section>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
