"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ProfileCard } from "@/components/ProfileCard";

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  linkedinUrl?: string | null;
};

type CurrentProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  linkedinUrl?: string | null;
  bio?: string | null;
  company?: string | null;
  role?: string | null;
  credibility: {
    groupsActiveIn: string[];
    trustLevel: "New" | "Contributor" | "Trusted";
    helpfulRepliesCount: number;
    knownFor: string[];
    verification: string[];
  };
};

type Reply = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  sender?: User | null;
};

type Introduction = {
  id: string;
  createdAt: string;
  connectorId: string;
  connector?: User | null;
};

type Request = {
  id: string;
  title?: string | null;
  content: string;
  status: string;
  createdAt: string;
  outcome?: string | null;
  resolvedAt?: string | null;
  creatorId: string;
  creator?: User | null;
  replies: Reply[];
  introductions: Introduction[];
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
  status: string;
  memberships: Membership[];
  requests: Request[];
};

type TriageRow = {
  id: string;
  groupId: string;
  groupName: string;
  discussionId: string;
  discussionTitle: string;
  startedBy: string;
  lastActivityLabel: string;
  latestPreview: string;
  actionLabel: string;
  urgency: "urgent" | "decision" | "steady";
  timestamp: number;
};

type HotPerson = {
  id: string;
  name: string;
  headline: string;
  rooms: Set<string>;
  activityCount: number;
};

function formatRelativeTime(value: string | number) {
  const timestamp = typeof value === "number" ? value : +new Date(value);
  const diff = Date.now() - timestamp;
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  if (diff < hour) return "under 1h ago";
  if (diff < day) return `${Math.max(1, Math.round(diff / hour))}h ago`;

  const days = Math.max(1, Math.round(diff / day));
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function discussionTitle(request: Request) {
  if (request.title?.trim()) return request.title.trim();
  return request.content.length > 72 ? `${request.content.slice(0, 69)}...` : request.content;
}

function shortenText(value: string, limit: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 3)}...` : compact;
}

function getLatestActivityTimestamp(group: Group) {
  const timestamps = group.requests.flatMap((request) => [
    +new Date(request.createdAt),
    ...request.replies.map((reply) => +new Date(reply.createdAt)),
    ...request.introductions.map((intro) => +new Date(intro.createdAt)),
    ...(request.resolvedAt ? [+new Date(request.resolvedAt)] : []),
  ]);

  return timestamps.length ? Math.max(...timestamps) : Date.now();
}

function getDiscussionsNeedingInput(group: Group, currentUserId: string) {
  return group.requests.filter((request) => {
    if (request.status !== "open") return false;
    if (request.creatorId === currentUserId) return false;
    const userAlreadyReplied = request.replies.some((reply) => reply.senderId === currentUserId);
    return !userAlreadyReplied;
  }).length;
}

function getRepliesInMotion(group: Group) {
  return group.requests.filter((request) => request.status === "open" && request.replies.length > 0).length;
}

function getCurrentMembership(group: Group, currentUserId: string | null) {
  if (!currentUserId) return null;

  return group.memberships.find(
    (membership) => membership.userId === currentUserId && membership.status === "active",
  );
}

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCredentialSigningIn, setIsCredentialSigningIn] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const currentUserId = session?.user?.id ?? null;

  useEffect(() => {
    void (async () => {
      setLoading(true);

      try {
        const response = await fetch("/api/groups");
        const data = (await response.json()) as Group[];

        if (!response.ok) {
          throw new Error("Unable to load groups");
        }

        setGroups(data);

        const profileResponse = await fetch("/api/me");
        if (profileResponse.ok) {
          const profileData = (await profileResponse.json()) as CurrentProfile;
          setCurrentProfile(profileData);
        }
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Unable to load groups");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const memberGroups = useMemo(() => {
    if (!currentUserId) return [];

    return groups.filter((group) =>
      group.status !== "draft" &&
      group.memberships.some(
        (membership) => membership.userId === currentUserId && membership.status === "active",
      ),
    );
  }, [currentUserId, groups]);

  const prioritizedGroups = useMemo(() => {
    if (!currentUserId) return [];

    return [...memberGroups].sort((left, right) => {
      const leftNeedsInput = getDiscussionsNeedingInput(left, currentUserId);
      const rightNeedsInput = getDiscussionsNeedingInput(right, currentUserId);
      if (leftNeedsInput !== rightNeedsInput) return rightNeedsInput - leftNeedsInput;

      const leftRepliesInMotion = getRepliesInMotion(left);
      const rightRepliesInMotion = getRepliesInMotion(right);
      if (leftRepliesInMotion !== rightRepliesInMotion) return rightRepliesInMotion - leftRepliesInMotion;

      return getLatestActivityTimestamp(right) - getLatestActivityTimestamp(left);
    });
  }, [currentUserId, memberGroups]);

  const cockpitGroups = useMemo(() => prioritizedGroups.slice(0, 4), [prioritizedGroups]);

  const totalWaiting = useMemo(
    () =>
      prioritizedGroups.reduce(
        (total, group) =>
          total +
          group.memberships.filter((membership) =>
            membership.status === "waitlist" ||
            membership.status === "pending" ||
            membership.status === "invited",
          ).length,
        0,
      ),
    [prioritizedGroups],
  );

  const totalInReview = useMemo(
    () =>
      prioritizedGroups.reduce(
        (total, group) => total + group.memberships.filter((membership) => membership.status === "pending").length,
        0,
      ),
    [prioritizedGroups],
  );

  const networkReach = useMemo(() => {
    if (!currentUserId) {
      return {
        directPeers: 0,
        estimatedExtendedReach: 0,
      };
    }

    const directPeerIds = new Set<string>();

    memberGroups.forEach((group) => {
      group.memberships.forEach((membership) => {
        if (membership.status === "active" && membership.userId !== currentUserId) {
          directPeerIds.add(membership.userId);
        }
      });
    });

    return {
      directPeers: directPeerIds.size,
      estimatedExtendedReach: directPeerIds.size * 147,
    };
  }, [currentUserId, memberGroups]);

  const triageRows = useMemo<TriageRow[]>(() => {
    if (!currentUserId) return [];

    const rows = prioritizedGroups.flatMap((group) =>
      group.requests
        .filter((request) => request.status === "open")
        .map((request) => {
          const userAlreadyReplied = request.replies.some((reply) => reply.senderId === currentUserId);
          if (request.creatorId === currentUserId || userAlreadyReplied) return null;

          const lastActivity = Math.max(
            +new Date(request.createdAt),
            ...request.replies.map((reply) => +new Date(reply.createdAt)),
          );
          const ageHours = (Date.now() - lastActivity) / (60 * 60 * 1000);
          const latestReply = request.replies.at(-1);

          return {
            id: `triage-${group.id}-${request.id}`,
            groupId: group.id,
            groupName: group.name,
            discussionId: request.id,
            discussionTitle: discussionTitle(request),
            startedBy: request.creator?.name || request.creator?.email || "Unknown member",
            lastActivityLabel: request.replies.length ? "needs your judgment" : "needs first reply",
            latestPreview: shortenText(latestReply?.body || request.content, 120),
            actionLabel: request.replies.length ? "Challenge or connect" : "Add first useful reply",
            urgency: ageHours <= 24 ? "urgent" : request.replies.length ? "decision" : "steady",
            timestamp: lastActivity,
          } satisfies TriageRow;
        })
        .filter((item): item is TriageRow => item !== null),
    );

    prioritizedGroups.forEach((group) => {
      const pendingCount = group.memberships.filter((membership) => membership.status === "pending").length;
      if (!pendingCount) return;

      rows.push({
        id: `review-${group.id}`,
        groupId: group.id,
        groupName: group.name,
        discussionId: "",
        discussionTitle: `${pendingCount} candidate${pendingCount === 1 ? "" : "s"} need member review`,
        startedBy: "Room governance",
        lastActivityLabel: "awaiting attestation",
        latestPreview: "Attest fit only when you would be comfortable sharing the room with this person.",
        actionLabel: "Review candidates",
        urgency: "decision",
        timestamp: Date.now(),
      });
    });

    return rows.sort((left, right) => right.timestamp - left.timestamp).slice(0, 6);
  }, [currentUserId, prioritizedGroups]);

  const recentOutcomes = useMemo(() => {
    return prioritizedGroups
      .flatMap((group) =>
        group.requests
          .filter((request) => request.status !== "open" && request.outcome)
          .map((request) => ({
            id: request.id,
            groupId: group.id,
            groupName: group.name,
            title: discussionTitle(request),
            outcome: request.outcome as string,
            timestamp: +(request.resolvedAt ? new Date(request.resolvedAt) : new Date(request.createdAt)),
          })),
      )
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 4);
  }, [prioritizedGroups]);

  const hotPeople = useMemo(() => {
    const people = new Map<string, HotPerson>();

    prioritizedGroups.forEach((group) => {
      group.memberships.forEach((membership) => {
        if (membership.status !== "active" || membership.userId === currentUserId) return;

        const existing = people.get(membership.userId);
        const person =
          existing ??
          {
            id: membership.userId,
            name: membership.user?.name || membership.user?.email || "Unknown member",
            headline: membership.user?.headline || "Active member",
            rooms: new Set<string>(),
            activityCount: 0,
          };

        person.rooms.add(group.name);
        people.set(membership.userId, person);
      });

      group.requests.forEach((request) => {
        const creator = people.get(request.creatorId);
        if (creator) creator.activityCount += 1;

        request.replies.forEach((reply) => {
          const sender = people.get(reply.senderId);
          if (sender) sender.activityCount += 1;
        });
      });
    });

    return [...people.values()]
      .sort((left, right) => right.activityCount - left.activityCount || right.rooms.size - left.rooms.size)
      .slice(0, 5);
  }, [currentUserId, prioritizedGroups]);

  const pathfinderHint = useMemo(() => {
    const person = hotPeople.find((item) => item.rooms.size > 0) ?? hotPeople[0];
    if (!person) return "Join rooms to build trusted paths across the network.";

    return `You -> ${person.name} -> ${person.rooms.values().next().value || "another room"} signal.`;
  }, [hotPeople]);

  const currentUser = useMemo(() => {
    if (!currentProfile) return null;

    return {
      id: currentProfile.id,
      name: currentProfile.name,
      avatarUrl: currentProfile.avatarUrl ?? null,
      headline: currentProfile.headline ?? null,
      linkedinUrl: currentProfile.linkedinUrl ?? null,
      groupsActiveIn: currentProfile.credibility.groupsActiveIn,
      trustLevel: currentProfile.credibility.trustLevel,
      helpfulRepliesCount: currentProfile.credibility.helpfulRepliesCount,
      knownFor: currentProfile.credibility.knownFor,
      verification: currentProfile.credibility.verification,
    };
  }, [currentProfile]);

  function renderGroupCard(group: Group, emphasize = false) {
    const needingInput = currentUserId ? getDiscussionsNeedingInput(group, currentUserId) : 0;
    const hasAction = needingInput > 0;
    const pendingCount = group.memberships.filter((membership) => membership.status === "pending").length;
    const waitingCount = group.memberships.filter((membership) => membership.status === "waitlist").length;
    const activeCount = group.memberships.filter((membership) => membership.status === "active").length;
    const openTopics = group.requests.filter((request) => request.status === "open").length;
    const latest = formatRelativeTime(getLatestActivityTimestamp(group));
    const statusLabel = hasAction ? `${needingInput} input needed` : pendingCount ? `${pendingCount} in review` : "Quiet";

    return (
      <Link
        key={group.id}
        href={`/groups/${group.id}`}
        className={`block rounded-3xl border px-5 py-5 transition hover:-translate-y-0.5 hover:shadow-sm ${
          emphasize ? "border-foreground/20 bg-panel shadow-sm" : "border-line bg-panel"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {getCurrentMembership(group, currentUserId)?.role === "owner" ? "Room you run" : "Room slot"}
            </p>
            <p className="mt-2 truncate text-lg font-semibold text-foreground">{group.name}</p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              hasAction ? "bg-rose-100 text-rose-800" : pendingCount ? "bg-amber-100 text-amber-800" : "bg-stone-100 text-stone-700"
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-2xl border border-line bg-white px-3 py-3">
            <p className="text-xs text-muted">Members</p>
            <p className="mt-1 font-medium text-foreground">{activeCount}/50</p>
          </div>
          <div className="rounded-2xl border border-line bg-white px-3 py-3">
            <p className="text-xs text-muted">Topics</p>
            <p className="mt-1 font-medium text-foreground">{openTopics}</p>
          </div>
          <div className="rounded-2xl border border-line bg-white px-3 py-3">
            <p className="text-xs text-muted">Waiting</p>
            <p className="mt-1 font-medium text-foreground">{waitingCount}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          {hasAction ? "Open the room and answer the threads where your context matters." : `Last movement ${latest}.`}
        </p>
      </Link>
    );
  }

  async function handleTestLogin() {
    setFlash(null);
    setIsLoggingIn(true);

    const result = await signIn("credentials", {
      email: "test@trust50.com",
      password: "Test123",
      redirect: false,
    });

    setIsLoggingIn(false);

    if (result?.error) {
      setFlash("Unable to sign in with test login");
      return;
    }

    router.refresh();
    window.location.href = "/";
  }

  async function handleCredentialLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFlash(null);
    setIsCredentialSigningIn(true);

    const result = await signIn("credentials", {
      email: emailInput.trim().toLowerCase(),
      password: passwordInput,
      redirect: false,
    });

    setIsCredentialSigningIn(false);

    if (result?.error) {
      setFlash("Unable to sign in with those credentials");
      return;
    }

    router.refresh();
    window.location.href = "/";
  }

  async function handleSignOut() {
    setFlash(null);
    await signOut({ redirect: false });
    setFlash("Signed out");
  }

  if (!currentUserId) {
    return (
      <main className="min-h-screen bg-background px-6 py-12 text-foreground">
        <div className="mx-auto max-w-3xl space-y-6">
          <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
            <div className="space-y-6">
              <div className="space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight">Trust50</h1>
                <p className="max-w-2xl text-sm leading-7 text-muted">
                  Sign in to see your groups, recent activity, and resolved outcomes in one place.
                </p>
              </div>

              <form onSubmit={handleCredentialLogin} className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm text-muted sm:col-span-1">
                  <span className="block">Email</span>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(event) => setEmailInput(event.target.value)}
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </label>
                <label className="space-y-2 text-sm text-muted sm:col-span-1">
                  <span className="block">Password</span>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(event) => setPasswordInput(event.target.value)}
                    className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                    placeholder="At least 8 characters"
                    autoComplete="current-password"
                    required
                  />
                </label>
                <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center">
                  <button
                    type="submit"
                    disabled={isCredentialSigningIn || status === "loading"}
                    className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCredentialSigningIn || status === "loading" ? "Signing in..." : "Sign in"}
                  </button>
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
                  >
                    Create account
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleTestLogin()}
                    disabled={isLoggingIn || status === "loading"}
                    className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isLoggingIn || status === "loading" ? "Signing in..." : "Use test login"}
                  </button>
                </div>
              </form>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/landing"
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  View landing page
                </Link>
                <Link
                  href="/how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  How Trust50 works
                </Link>
              </div>

              <p className="text-sm text-muted">
                The test login is still available for demos, but new accounts can now register directly.
              </p>
            </div>
          </section>

          {flash ? (
            <div className="rounded-2xl border border-line bg-white px-5 py-3 text-sm text-muted shadow-sm">
              {flash}
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.35fr_0.75fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trust50 cockpit</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your network home</h1>
                <p className="mt-1 text-sm text-muted">
                  Four rooms. One control centre for the decisions, reviews, and outcomes that matter right now.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Members can join up to 4 groups, enough to know the room and still move across Trust50 with context.
                </p>
                {currentUserId ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Room slots</p>
                      <p className="mt-2 text-2xl font-semibold">{cockpitGroups.length}/4</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Direct peers</p>
                      <p className="mt-2 text-2xl font-semibold">{formatCompactNumber(networkReach.directPeers)}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Extended reach</p>
                      <p className="mt-2 text-2xl font-semibold">~{formatCompactNumber(networkReach.estimatedExtendedReach)}</p>
                    </div>
                    <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Waiting rooms</p>
                      <p className="mt-2 text-2xl font-semibold">{totalWaiting}</p>
                    </div>
                    <p className="text-sm text-muted sm:col-span-2 lg:col-span-4">
                      Pathfinder: {pathfinderHint}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/landing"
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  View landing page
                </Link>
                <Link
                  href="/how-it-works"
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  How Trust50 works
                </Link>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  Sign out
                </button>
              </div>
            </div>
          </section>

          {flash ? (
            <div className="rounded-2xl border border-line bg-white px-5 py-3 text-sm text-muted shadow-sm">
              {flash}
            </div>
          ) : null}

          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">4-room matrix</h2>
                <p className="mt-1 text-sm text-muted">Each card is one of the rooms competing for your limited attention.</p>
              </div>
              <Link
                href="/explore-groups"
                className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Explore rooms
              </Link>
            </div>

            <div className="mt-5 space-y-5">
              {!loading && !prioritizedGroups.length ? (
                <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-4 text-sm text-muted">
                  <p className="font-medium text-foreground">You are not in any rooms yet.</p>
                  <p className="mt-1">Browse rooms and request access, or create the first room you want to run.</p>
                  <div className="mt-3 flex flex-wrap gap-3">
                    <Link
                      href="/explore-groups"
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                    >
                      Explore rooms
                    </Link>
                    <Link
                      href="/start-a-group"
                      className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                    >
                      Start a group
                    </Link>
                  </div>
                </div>
              ) : null}

              {cockpitGroups.length ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {cockpitGroups.map((group) =>
                    renderGroupCard(group, getCurrentMembership(group, currentUserId)?.role === "owner"),
                  )}
                  {Array.from({ length: Math.max(0, 4 - cockpitGroups.length) }).map((_, index) => (
                    <Link
                      key={`empty-slot-${index}`}
                      href="/explore-groups"
                      className="block rounded-3xl border border-dashed border-line bg-panel px-5 py-5 transition hover:border-foreground"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Open slot</p>
                      <p className="mt-2 text-lg font-semibold text-foreground">Dock a trusted room</p>
                      <p className="mt-4 text-sm text-muted">
                        Spend this slot only when the room is worth your context and contribution.
                      </p>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Input required</h2>
                <p className="mt-1 text-sm text-muted">
                  Places where your reply, challenge, attestation, or intro can move something forward.
                </p>
              </div>

              <span className="rounded-full bg-panel px-4 py-2 text-sm text-muted">
                {triageRows.length} active signal{triageRows.length === 1 ? "" : "s"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {!triageRows.length ? <p className="text-sm text-muted">No input required right now. Your rooms are quiet.</p> : null}

              {triageRows.map((item) => (
                <Link
                  key={item.id}
                  href={item.discussionId ? `/groups/${item.groupId}/discussions/${item.discussionId}` : `/groups/${item.groupId}/votes`}
                  className="block rounded-2xl border border-line bg-panel px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-sm"
                >
                  <p className="text-sm font-medium text-foreground">&rarr; &ldquo;{item.discussionTitle}&rdquo;</p>
                  <p className="mt-2 text-sm text-muted">Started by {item.startedBy} · {item.lastActivityLabel}</p>
                  <p className="mt-1 text-sm text-muted">Latest: &ldquo;{item.latestPreview}&rdquo;</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                    <span>{item.groupName}</span>
                    <span>Last activity {formatRelativeTime(item.timestamp)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {recentOutcomes.length ? (
            <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Outcome ledger</h2>
              <p className="mt-1 text-sm text-muted">Proof that the rooms are creating movement, not just messages.</p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {recentOutcomes.map((item) => (
                  <Link
                    key={item.id}
                    href={`/groups/${item.groupId}/discussions/${item.id}`}
                    className="rounded-2xl border border-line bg-panel px-4 py-4 transition hover:border-foreground"
                  >
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.outcome}</p>
                    <p className="mt-2 text-xs text-muted">
                      {item.groupName} · {formatRelativeTime(item.timestamp)}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="space-y-6">
          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Signal map</h2>
            <p className="mt-1 text-sm text-muted">The people heating up across your four-room surface area.</p>

            <div className="mt-5 space-y-3">
              {!hotPeople.length ? <p className="text-sm text-muted">Join rooms to see active people here.</p> : null}

              {hotPeople.map((person) => (
                <Link
                  key={person.id}
                  href={`/members/${person.id}`}
                  className="block rounded-2xl border border-line bg-panel px-4 py-4 transition hover:border-foreground"
                >
                  <p className="font-medium text-foreground">{person.name}</p>
                  <p className="mt-1 text-sm text-muted">{person.headline}</p>
                  <p className="mt-2 text-xs text-muted">
                    {person.activityCount} signal{person.activityCount === 1 ? "" : "s"} across {person.rooms.size} room{person.rooms.size === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Pathfinder</h2>
            <p className="mt-1 text-sm text-muted">Trust50 is a route map, not a feed.</p>
            <div className="mt-5 rounded-2xl border border-line bg-panel px-4 py-4">
              <p className="text-sm font-medium text-foreground">{pathfinderHint}</p>
              <p className="mt-2 text-sm text-muted">
                Ask in the room where trust is strongest first. The second hop is usually warmer than a cold search.
              </p>
            </div>
            <div className="mt-4 rounded-2xl border border-line bg-panel px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Member review</p>
              <p className="mt-2 text-sm text-foreground">
                {totalInReview} candidate{totalInReview === 1 ? "" : "s"} waiting for attestations.
              </p>
            </div>
          </section>

          {currentUser ? <ProfileCard user={currentUser} /> : null}
        </aside>
      </div>
    </main>
  );
}
