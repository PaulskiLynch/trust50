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
  mediaUrl?: string | null;
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
  supportCount: number;
  mediaUrl?: string | null;
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

function replyCountLabel(count: number) {
  if (count === 0) return "New since yesterday";
  if (count === 1) return "1 comment today";
  return `${count} comments today`;
}

function supportCountLabel(count: number) {
  if (count === 1) return "1 support";
  return `${count} support`;
}

function getSupportCount(request: Request) {
  return Math.max(0, request.replies.length * 2 + (request.mediaUrl ? 1 : 0));
}

const sampleMediaUrls = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1576086213369-97a306d36557?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
];

const emptyWirePreviews = [
  {
    room: "AI Operators",
    person: "Maya",
    title: "How are you deciding where AI should stay human-in-the-loop?",
    meta: "4 comments today",
  },
  {
    room: "Founder Circle",
    person: "Sara",
    title: "First senior hire: did you wait for pain or hire ahead of it?",
    meta: "2 members you may know",
  },
  {
    room: "Property Ops",
    person: "Olivia",
    title: "Concessions or hold rate when renewal demand is soft?",
    meta: "Fast replies recently",
  },
];

function getSampleMediaUrl(groupName: string, requestId: string) {
  const key = `${groupName}-${requestId}`;
  const index = [...key].reduce((total, char) => total + char.charCodeAt(0), 0) % sampleMediaUrls.length;
  return sampleMediaUrls[index];
}

function SupportIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M7 11v9H4.8A1.8 1.8 0 0 1 3 18.2v-5.4A1.8 1.8 0 0 1 4.8 11H7Z" strokeLinejoin="round" />
      <path
        d="M7 11h2.6l2.3-6.2c.3-.8 1.2-1.2 2-.8.8.3 1.2 1.2.9 2l-1.2 3.2H18a2 2 0 0 1 2 2.3l-.8 5.4A3.6 3.6 0 0 1 15.6 20H7v-9Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M6 17.5 4 21v-4.8A7.5 7.5 0 0 1 5.5 4h13A3.5 3.5 0 0 1 22 7.5v5A3.5 3.5 0 0 1 18.5 16h-8.7c-1.4 0-2.7.5-3.8 1.5Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function SkipIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="m7 7 10 10M17 7 7 17" strokeLinecap="round" />
    </svg>
  );
}

function RoomsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" strokeLinejoin="round" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" strokeLinecap="round" />
      <path d="M14 8l4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
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
            supportCount: getSupportCount(request),
            mediaUrl: request.mediaUrl ?? getSampleMediaUrl(group.name, request.id),
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
        supportCount: candidateCount,
        mediaUrl: null,
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

  const hasNoRooms = !loading && !prioritizedGroups.length;

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
            <div className="space-y-8">
              <div className="space-y-5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/trust50-logo.png" alt="Trust50" className="h-48 w-48 rounded-[32px] object-contain" />
                <div className="space-y-3">
                  <h1 className="text-3xl font-semibold tracking-tight">Private circles for trusted advice and warm introductions.</h1>
                  <p className="max-w-2xl text-base leading-7 text-muted">
                    Join small, vouched trust circles where founders, operators, investors, and specialists help each other make better decisions.
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-3">
                  {["50 max per circle", "4 circles per person", "Vouched access"].map((label) => (
                    <div key={label} className="rounded-2xl border border-line bg-panel px-4 py-3 text-center text-xs font-medium text-foreground">
                      {label}
                    </div>
                  ))}
                </div>

                <div className="rounded-3xl border border-line bg-panel p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-semibold text-foreground shadow-sm">
                        You
                      </div>
                    </div>
                    <div className="h-px flex-1 bg-line" />
                    <div className="text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-white shadow-sm">
                        Circle
                      </div>
                    </div>
                    <div className="h-px flex-1 bg-line" />
                    <div className="text-center">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-xs font-semibold text-foreground shadow-sm">
                        Intro
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-muted">
                    Trusted context turns into the next warm path.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Create account
                  </Link>
                  <Link
                    href="/explore-groups"
                    className="inline-flex items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
                  >
                    Browse circles
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
              </div>

              <details className="border-t border-line pt-6">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Already have an account? Sign in
                </summary>
                <form onSubmit={handleCredentialLogin} className="mt-4 grid gap-3 sm:grid-cols-2">
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
                      className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isCredentialSigningIn || status === "loading" ? "Signing in..." : "Sign in"}
                    </button>
                  </div>
                </form>
              </details>

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

          <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
            <span>Privacy policy</span>
            <span>Terms</span>
            <Link href="/how-it-works" className="font-medium transition hover:text-foreground">
              How it works
            </Link>
          </footer>

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
          <div className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/trust50-logo.png" alt="Trust50" className="h-16 w-16 rounded-2xl object-contain sm:h-14 sm:w-14" />
          </div>
          <div className="flex items-end gap-1 sm:gap-3">
            <Link
              href="/explore-groups"
              className="flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
            >
              <RoomsIcon />
              <span>Circles</span>
            </Link>
            {currentUser ? (
              <Link
                href={`/members/${currentUser.id}`}
                className="flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
              >
                <MeIcon />
                <span>Me</span>
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
            >
              <SignOutIcon />
              <span>Out</span>
            </button>
          </div>
        </header>

        {flash ? (
          <div className="mb-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted shadow-sm">
            {flash}
          </div>
        ) : null}

        <section className="overflow-hidden rounded-[20px] border border-line bg-white shadow-sm">
          {hasNoRooms ? (
            <div className="px-5 py-6">
              <p className="text-lg font-semibold text-foreground">Your Wire is empty</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Join a trust circle to start seeing operator questions, warm introductions, hiring decisions, and trusted requests for judgment.
              </p>
              <div className="mt-5 space-y-3">
                {emptyWirePreviews.map((preview) => (
                  <div key={preview.title} className="rounded-2xl border border-line bg-panel/70 px-4 py-3 opacity-75 blur-[0.2px]">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted">
                      <span>{preview.room}</span>
                      <span>/</span>
                      <span>{preview.person}</span>
                    </div>
                    <p className="mt-2 text-sm font-medium leading-5 text-foreground">&ldquo;{preview.title}&rdquo;</p>
                    <p className="mt-1 text-xs text-muted">{preview.meta}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/explore-groups"
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Find a circle where you can add value
                </Link>
                <Link
                  href="/start-a-group"
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  Start a circle
                </Link>
              </div>
            </div>
          ) : !feedItems.length ? (
            <div className="px-5 py-8">
              <p className="font-medium text-foreground">Nothing needs you right now.</p>
              <p className="mt-1 text-sm text-muted">
                Build your profile so curators can understand where you can contribute, or browse circles with live discussions.
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {currentUser ? (
                  <Link
                    href={`/members/${currentUser.id}#build-profile`}
                    className="inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Build my profile
                  </Link>
                ) : null}
                <Link
                  href="/explore-groups"
                  className="inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  Browse circles
                </Link>
              </div>
            </div>
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
                  item.kind === "vouch" ? (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-sm font-semibold text-white">
                      {String(item.candidateCount ?? 0)}
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src="/profile-placeholder.svg"
                      alt={item.memberName}
                      className="h-11 w-11 shrink-0 rounded-full object-cover"
                    />
                  )
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
                  {item.mediaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.mediaUrl}
                      alt=""
                      className="mt-3 aspect-[16/9] w-full rounded-2xl border border-line object-cover"
                    />
                  ) : null}
                  <p className="mt-2 text-xs font-medium text-muted">
                    {supportCountLabel(item.supportCount)} · {item.socialProof}
                  </p>
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-4 border-t border-line/70 pt-2 pl-14">
                <button
                  type="button"
                  onClick={() => setFlash("Supported.")}
                  className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
                >
                  <SupportIcon />
                  <span>Support</span>
                </button>
                <Link
                  href={item.discussionId ? `/groups/${item.groupId}/discussions/${item.discussionId}` : `/groups/${item.groupId}/votes`}
                  className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
                >
                  <CommentIcon />
                  <span>{item.kind === "vouch" ? "Vote" : "Comment"}</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setFlash("Passed.")}
                  title="Pass"
                  aria-label="Pass"
                  className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
                >
                  <SkipIcon />
                  <span>Pass</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFlash("Saved for later.")}
                  title="Later"
                  aria-label="Later"
                  className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
                >
                  <ClockIcon />
                  <span>Later</span>
                </button>
              </div>
            </div>
          ))}
        </section>

        <nav className="sticky bottom-4 mt-6 grid grid-cols-3 overflow-hidden rounded-full border border-line bg-white p-1 shadow-sm">
          <Link href="/explore-groups" className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground">
            Circles
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

        <footer className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-2 pb-2 text-xs text-muted">
          <Link href="/how-it-works" className="transition hover:text-foreground">
            How circles work
          </Link>
          <Link href="/faq" className="transition hover:text-foreground">
            FAQ
          </Link>
          <Link href="/landing" className="transition hover:text-foreground">
            Landing page
          </Link>
        </footer>
      </div>
    </main>
  );
}
