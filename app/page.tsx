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

type ActivityRow = {
  id: string;
  groupId: string;
  groupName: string;
  discussionTitle: string;
  replyCount: number;
  lastActivityLabel: string;
  startedBy: string;
  latestPreview: string;
  timestamp: number;
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
  const [selectedGroupId, setSelectedGroupId] = useState("all");

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

  const filteredMemberGroups = useMemo(() => {
    if (selectedGroupId === "all") return prioritizedGroups;
    return prioritizedGroups.filter((group) => group.id === selectedGroupId);
  }, [prioritizedGroups, selectedGroupId]);

  const ownedGroups = useMemo(() => {
    return prioritizedGroups.filter((group) => getCurrentMembership(group, currentUserId)?.role === "owner");
  }, [currentUserId, prioritizedGroups]);

  const joinedGroups = useMemo(() => {
    return prioritizedGroups.filter((group) => getCurrentMembership(group, currentUserId)?.role !== "owner");
  }, [currentUserId, prioritizedGroups]);

  const recentActivity = useMemo<ActivityRow[]>(() => {
    return filteredMemberGroups
      .flatMap((group) =>
        group.requests
          .map((request) => {
            const replyCount = request.replies.length;
            if (replyCount === 0) return null;

            const latestReplyTimestamp = Math.max(
              ...request.replies.map((reply) => +new Date(reply.createdAt)),
            );

            return {
              id: `activity-${group.id}-${request.id}`,
              groupId: group.id,
              groupName: group.name,
              discussionTitle: discussionTitle(request),
              replyCount,
              lastActivityLabel: replyCount === 1 ? "1 new reply" : `${replyCount} new replies`,
              startedBy: request.creator?.name || request.creator?.email || "Unknown member",
              latestPreview: shortenText(request.replies.at(-1)?.body || request.content, 100),
              timestamp: latestReplyTimestamp,
            };
          })
          .filter((item): item is ActivityRow => item !== null),
      )
      .sort((left, right) => right.timestamp - left.timestamp)
      .slice(0, 5);
  }, [filteredMemberGroups]);

  const recentOutcomes = useMemo(() => {
    return filteredMemberGroups
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
      .slice(0, 2);
  }, [filteredMemberGroups]);

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

    return (
      <Link
        key={group.id}
        href={`/groups/${group.id}`}
        className={`flex items-center justify-between gap-4 rounded-2xl border px-4 py-3 transition hover:-translate-y-0.5 hover:shadow-sm ${
          emphasize ? "border-foreground/20 bg-panel shadow-sm" : "border-line bg-panel"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className={`h-3 w-3 shrink-0 rounded-full ${
              hasAction ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]" : "bg-foreground"
            }`}
          />
          <p className="truncate font-medium text-foreground">{group.name}</p>
        </div>
        <div className="shrink-0 text-sm text-muted">
          {hasAction ? `${needingInput} need input` : "Quiet"}
        </div>
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
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-semibold tracking-tight">Your network home</h1>
                <p className="mt-1 text-sm text-muted">
                  A quiet view of the groups, discussions, and outcomes that matter right now.
                </p>
                <p className="mt-2 text-sm text-muted">
                  Members can join up to 4 groups, enough to know the room and still move across Trust50 with context.
                </p>
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
                <h2 className="text-xl font-semibold">Your groups</h2>
                <p className="mt-1 text-sm text-muted">A quick read on where you need to step in.</p>
              </div>
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

              {ownedGroups.length ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Rooms you run</h3>
                    <p className="mt-1 text-sm text-muted">The rooms where you set the tone and keep the quality high.</p>
                  </div>
                  <div className="space-y-3">
                    {ownedGroups.map((group) => renderGroupCard(group, true))}
                  </div>
                </div>
              ) : null}

              {joinedGroups.length ? (
                <div className="space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Rooms you joined</h3>
                    <p className="mt-1 text-sm text-muted">The rooms you spend one of your four slots on.</p>
                  </div>
                  <div className="space-y-3">
                    {joinedGroups.map((group) => renderGroupCard(group))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Recent activity</h2>
                <p className="mt-1 text-sm text-muted">
                  A structured view of where replies are moving discussions forward.
                </p>
              </div>

              <label className="space-y-2 text-sm text-muted">
                <span className="block">Group</span>
                <select
                  value={selectedGroupId}
                  onChange={(event) => setSelectedGroupId(event.target.value)}
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm text-foreground outline-none transition hover:border-foreground"
                >
                  <option value="all">All groups</option>
                  {prioritizedGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-5 space-y-3">
              {!recentActivity.length ? <p className="text-sm text-muted">No recent activity yet.</p> : null}

              {recentActivity.map((item) => (
                <Link
                  key={item.id}
                  href={`/groups/${item.groupId}`}
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
              <h2 className="text-xl font-semibold">Recent outcomes</h2>
              <p className="mt-1 text-sm text-muted">A compact view of what recently reached a decision.</p>

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

        <aside className="space-y-6">{currentUser ? <ProfileCard user={currentUser} /> : null}</aside>
      </div>
    </main>
  );
}
