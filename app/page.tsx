"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
};

type CurrentProfile = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  credibility: {
    trustLevel: "New" | "Contributor" | "Trusted";
    helpfulRepliesCount: number;
  };
};

type Reply = {
  id: string;
  body?: string | null;
  createdAt: string;
  senderId: string;
  sender?: User | null;
};

type Request = {
  id: string;
  title?: string | null;
  content: string;
  status: string;
  createdAt: string;
  creatorId: string;
  creator?: User | null;
  replies: Reply[];
};

type Membership = {
  id: string;
  userId: string;
  role?: string;
  status: string;
};

type Group = {
  id: string;
  name: string;
  status: string;
  memberships: Membership[];
  requests: Request[];
};

type FeedItem = {
  id: string;
  groupId: string;
  groupName: string;
  discussionId: string;
  memberName: string;
  memberAvatarUrl?: string | null;
  question: string;
  preview: string;
  socialProof: string;
  kind: "question" | "vouch";
  candidateCount?: number;
  timestamp: number;
};

function discussionTitle(request: Request) {
  if (request.title?.trim()) return request.title.trim();
  return request.content.length > 72 ? `${request.content.slice(0, 69)}...` : request.content;
}

function shortenText(value: string, limit: number) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 3)}...` : compact;
}

function memberInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "T";
}

function replyCountLabel(count: number) {
  if (count === 0) return "New since yesterday";
  if (count === 1) return "1 reply today";
  return `${count} replies today`;
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function getLatestActivityTimestamp(group: Group) {
  const timestamps = group.requests.flatMap((request) => [
    +new Date(request.createdAt),
    ...request.replies.map((reply) => +new Date(reply.createdAt)),
  ]);

  return timestamps.length ? Math.max(...timestamps) : Date.now();
}

function getQuestionsNeedingReply(group: Group, currentUserId: string) {
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
      const leftNeedsInput = getQuestionsNeedingReply(left, currentUserId);
      const rightNeedsInput = getQuestionsNeedingReply(right, currentUserId);
      if (leftNeedsInput !== rightNeedsInput) return rightNeedsInput - leftNeedsInput;

      const leftRepliesInMotion = getRepliesInMotion(left);
      const rightRepliesInMotion = getRepliesInMotion(right);
      if (leftRepliesInMotion !== rightRepliesInMotion) return rightRepliesInMotion - leftRepliesInMotion;

      return getLatestActivityTimestamp(right) - getLatestActivityTimestamp(left);
    });
  }, [currentUserId, memberGroups]);

  const feedItems = useMemo((): FeedItem[] => {
    if (!currentUserId) return [];

    const questionRows = prioritizedGroups.flatMap((group) =>
      group.requests
        .filter((request) => request.status === "open")
        .reduce<FeedItem[]>((items, request) => {
          const userAlreadyReplied = request.replies.some((reply) => reply.senderId === currentUserId);
          if (request.creatorId === currentUserId || userAlreadyReplied) {
            return items;
          }

          const lastActivity = Math.max(
            +new Date(request.createdAt),
            ...request.replies.map((reply) => +new Date(reply.createdAt)),
          );

          items.push({
            id: `question-${group.id}-${request.id}`,
            groupId: group.id,
            groupName: group.name,
            discussionId: request.id,
            memberName: request.creator?.name || request.creator?.email || "Unknown member",
            memberAvatarUrl: request.creator?.avatarUrl ?? null,
            question: discussionTitle(request),
            preview: shortenText(request.content, 150),
            socialProof: replyCountLabel(request.replies.length),
            kind: "question",
            timestamp: lastActivity,
          });

          return items;
        }, []),
    );

    const vouchRows = prioritizedGroups
      .map((group) => ({
        group,
        candidateCount: group.memberships.filter((membership) => membership.status === "pending").length,
      }))
      .filter((row) => row.candidateCount > 0)
      .map(({ group, candidateCount }) => ({
        id: `vouch-${group.id}`,
        groupId: group.id,
        groupName: group.name,
        discussionId: "",
        memberName: "Voting",
        memberAvatarUrl: null,
        question: `${candidateCount} candidate${candidateCount === 1 ? "" : "s"} need room vouches`,
        preview: "The room needs a quick read on who belongs at the table.",
        socialProof: `${candidateCount} waiting`,
        kind: "vouch" as const,
        candidateCount,
        timestamp: Date.now(),
      }));

    return [...questionRows, ...vouchRows].sort((left, right) => right.timestamp - left.timestamp).slice(0, 8);
  }, [currentUserId, prioritizedGroups]);

  const currentUser = useMemo(() => {
    if (!currentProfile) return null;

    return {
      id: currentProfile.id,
      email: currentProfile.email,
      name: currentProfile.name,
      avatarUrl: currentProfile.avatarUrl ?? null,
      headline: currentProfile.headline ?? null,
      trustLevel: currentProfile.credibility.trustLevel,
      helpfulRepliesCount: currentProfile.credibility.helpfulRepliesCount,
    };
  }, [currentProfile]);

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
                  Sign in to see the questions your rooms need you on.
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
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trust50</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">For you</h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/explore-groups"
              className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
            >
              Rooms
            </Link>
            {currentUser ? (
              <Link
                href={`/members/${currentUser.id}`}
                className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Me
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-full border border-line bg-white px-3 py-2 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground"
            >
              Sign out
            </button>
          </div>
        </header>

        {flash ? (
          <div className="mb-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted shadow-sm">
            {flash}
          </div>
        ) : null}

        {!loading && !prioritizedGroups.length ? (
          <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
            <p className="font-medium text-foreground">You are not in any rooms yet.</p>
            <p className="mt-1 text-sm text-muted">Join a room and your Wire will appear here.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link
                href="/explore-groups"
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Browse rooms
              </Link>
              <Link
                href="/start-a-group"
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Start a room
              </Link>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-sm">
          {!feedItems.length ? (
            <div className="px-5 py-8 text-sm text-muted">Nothing needs you right now.</div>
          ) : null}

          {feedItems.map((item) => (
            <div key={item.id} className="border-b border-line px-5 py-5 last:border-b-0">
              <div className="flex items-start gap-3">
                {item.memberAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.memberAvatarUrl}
                    alt={item.memberName}
                    className="h-11 w-11 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
                    {item.kind === "vouch" ? String(item.candidateCount ?? 0) : memberInitial(item.memberName)}
                  </div>
                )}

                <Link
                  href={item.discussionId ? `/groups/${item.groupId}/discussions/${item.discussionId}` : `/groups/${item.groupId}/votes`}
                  className="min-w-0 flex-1"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{item.memberName}</p>
                    <span className="rounded-full bg-panel px-2.5 py-1 text-xs font-medium text-muted">
                      {item.groupName}
                    </span>
                  </div>
                  <p className="mt-2 text-base font-semibold leading-6 text-foreground">&ldquo;{item.question}&rdquo;</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.memberName}: &ldquo;{item.preview}&rdquo;
                  </p>
                  <p className="mt-2 text-xs font-medium text-muted">{item.socialProof}</p>
                </Link>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 pl-14">
                <Link
                  href={item.discussionId ? `/groups/${item.groupId}/discussions/${item.discussionId}` : `/groups/${item.groupId}/votes`}
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {item.kind === "vouch" ? "Vote" : "Reply"}
                </Link>
                <button
                  type="button"
                  onClick={() => setFlash("Passed.")}
                  title="Pass"
                  aria-label="Pass"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-foreground hover:text-foreground"
                >
                  <SkipIcon />
                </button>
                <button
                  type="button"
                  onClick={() => setFlash("Saved for later.")}
                  title="Later"
                  aria-label="Later"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-muted transition hover:border-foreground hover:text-foreground"
                >
                  <ClockIcon />
                </button>
              </div>
            </div>
          ))}
        </section>

        <nav className="sticky bottom-4 mt-6 grid grid-cols-3 overflow-hidden rounded-full border border-line bg-white p-1 shadow-sm">
          <Link href="/explore-groups" className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground">
            Rooms
          </Link>
          <Link href="/" className="rounded-full bg-foreground px-4 py-2 text-center text-sm font-medium text-white">
            Wire
          </Link>
          {currentUser ? (
            <Link href={`/members/${currentUser.id}`} className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground">
              Me
            </Link>
          ) : (
            <span className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted">
              Me
            </span>
          )}
        </nav>
      </div>
    </main>
  );
}
