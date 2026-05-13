"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AppTopNav } from "@/components/AppTopNav";

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl?: string | null;
  headline?: string | null;
  trustLevelCached?: string | null;
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
  memberTrustLevel: string;
  question: string;
  preview: string;
  socialProof: string;
  supportCount: number;
  decisionBadge: string;
  supporterAvatars: { id: string; name: string; avatarUrl?: string | null }[];
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
  return Math.max(0, request.replies.length * 2);
}

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

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.3 6.94 1.97 1.97 0 0 0 5.25 3ZM20.44 12.73c0-3.45-1.84-5.05-4.29-5.05-1.98 0-2.87 1.1-3.37 1.86V8.5H9.4c.04.69 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.13-.93.27-.68.88-1.38 1.9-1.38 1.34 0 1.88 1.03 1.88 2.54V20h3.38v-7.27Z" />
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

function decisionBadgeFor(request: Request, groupName: string) {
  const text = `${request.title || ""} ${request.content} ${groupName}`.toLowerCase();

  if (text.match(/hire|candidate|vp|role|product/)) return "Hiring decision";
  if (text.match(/risk|underwrite|investment|capital|fund/)) return "Investment judgment";
  if (text.match(/concession|rate|leasing|maintenance|property/)) return "Operator decision";
  if (text.match(/ai|data|automation/)) return "AI adoption";
  return "Decision request";
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const linkedInEnabled = process.env.NEXT_PUBLIC_LINKEDIN_ENABLED === "true";
  const [groups, setGroups] = useState<Group[]>([]);
  const [currentProfile, setCurrentProfile] = useState<CurrentProfile | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isCredentialSigningIn, setIsCredentialSigningIn] = useState(false);
  const [isLinkedInSigningIn, setIsLinkedInSigningIn] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [supportedItemIds, setSupportedItemIds] = useState<Set<string>>(() => new Set());

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
            memberTrustLevel: request.creator?.trustLevelCached || "Building trust",
            question: discussionTitle(request),
            preview: shortenText(request.content, 150),
            socialProof: replyCountLabel(request.replies.length),
            supportCount: getSupportCount(request),
            decisionBadge: decisionBadgeFor(request, group.name),
            supporterAvatars: request.replies
              .filter((reply) => reply.sender)
              .slice(0, 3)
              .map((reply) => ({
                id: reply.senderId,
                name: reply.sender?.name || reply.sender?.email || "Member",
                avatarUrl: reply.sender?.avatarUrl ?? null,
              })),
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
        memberTrustLevel: "Room read",
        question: `${candidateCount} candidate${candidateCount === 1 ? "" : "s"} need circle vouches`,
        preview: "The circle needs a quick read on who belongs at the table.",
        socialProof: `${candidateCount} waiting`,
        supportCount: candidateCount,
        decisionBadge: "Membership decision",
        supporterAvatars: group.memberships
          .filter((membership) => membership.status === "active")
          .slice(0, 3)
          .map((membership) => ({
            id: membership.userId,
            name: "Member",
            avatarUrl: null,
          })),
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

  async function handleLinkedInLogin() {
    setFlash(null);
    setIsLinkedInSigningIn(true);
    await signIn("linkedin", { callbackUrl: "/" });
    setIsLinkedInSigningIn(false);
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

                {linkedInEnabled ? (
                  <button
                    type="button"
                    onClick={() => void handleLinkedInLogin()}
                    disabled={isLinkedInSigningIn || status === "loading"}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-[#0A66C2] px-5 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                  >
                    <LinkedInIcon />
                    <span>{isLinkedInSigningIn ? "Connecting..." : "Continue with LinkedIn"}</span>
                  </button>
                ) : null}
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
            <Link href="/privacy" className="font-medium transition hover:text-foreground">
              Privacy policy
            </Link>
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
        <AppTopNav activeTab="feed" currentUserId={currentUser?.id ?? null} />

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
                    <span className="rounded-full border border-line bg-white px-2.5 py-1 text-xs font-medium text-muted">
                      {item.memberTrustLevel}
                    </span>
                    <span className="rounded-full bg-panel px-2.5 py-1 text-xs font-medium text-muted">
                      {item.groupName}
                    </span>
                  </div>
                  <div className="mt-2 inline-flex rounded-full border border-line bg-panel px-2.5 py-1 text-xs font-medium text-muted">
                    {item.decisionBadge}
                  </div>
                  <p className="mt-2 text-base font-semibold leading-6 text-foreground">
                    {item.kind === "vouch" ? item.question : `"${item.question}"`}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.kind === "vouch" ? item.preview : `${item.memberName}: "${item.preview}"`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                    {item.supporterAvatars.length ? (
                      <div className="flex -space-x-2">
                        {item.supporterAvatars.map((supporter) =>
                          supporter.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={supporter.id}
                              src={supporter.avatarUrl}
                              alt={supporter.name}
                              className="h-6 w-6 rounded-full border border-white object-cover"
                            />
                          ) : (
                            <span
                              key={supporter.id}
                              className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-stone-200 text-[10px] font-semibold text-stone-700"
                            >
                              {initials(supporter.name)}
                            </span>
                          ),
                        )}
                      </div>
                    ) : null}
                    <span>{supportCountLabel(item.supportCount)}</span>
                    <span>/</span>
                    <span>{item.socialProof}</span>
                    {item.supportCount > 0 ? (
                      <>
                        <span>/</span>
                        <span>including 1 from your trusted circle</span>
                      </>
                    ) : null}
                  </div>
                </Link>
              </div>

              <div className="mt-4 grid grid-cols-4 border-t border-line/70 pt-2 pl-14">
                <button
                  type="button"
                  onClick={() => {
                    setSupportedItemIds((current) => new Set(current).add(item.id));
                    setFlash("Supported.");
                  }}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-xs font-medium transition hover:bg-panel ${
                    supportedItemIds.has(item.id) ? "text-foreground" : "text-muted hover:text-foreground"
                  }`}
                >
                  <SupportIcon />
                  <span>{supportedItemIds.has(item.id) ? "Supported" : "Support"}</span>
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
