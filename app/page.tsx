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
  helpfulSource?: string | null;
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
  price?: number | null;
  memberCount?: number;
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
  mode: "judgment" | "first-reply" | "attestation";
  urgency: "urgent" | "decision" | "steady";
  timestamp: number;
};

type ReviewRow = {
  id: string;
  groupId: string;
  groupName: string;
  candidateCount: number;
};

type HotPerson = {
  id: string;
  name: string;
  headline: string;
  rooms: Set<string>;
  activityCount: number;
};

type Patron = {
  name: string;
  since: string;
};

const roomPatrons: Record<string, Patron[]> = {
  "group-operators": [
    { name: "Alex Morgan", since: "Sept" },
    { name: "Sara Holt", since: "Oct" },
    { name: "Charlotte Reed", since: "Nov" },
  ],
  "group-property-management": [
    { name: "Olivia Grant", since: "Sept" },
    { name: "Sam Patel", since: "Oct" },
  ],
};

const openHouseFallbacks = [
  {
    room: "Series B+ EU",
    date: "Dec 5",
    time: "12pm EST",
    spots: 45,
    brief: "1 real problem brief, identity-safe discussion, no past threads.",
  },
  {
    room: "AI Builders Premium",
    date: "Dec 7",
    time: "4pm CET",
    spots: 12,
    brief: "Live operator problem, moderated by the room chair.",
  },
];

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

function urgencyLabel(urgency: TriageRow["urgency"]) {
  if (urgency === "urgent") return "Hot";
  if (urgency === "decision") return "Warm";
  return "Fresh";
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

function groupStatusCopy(group: Group, currentUserId: string) {
  const needsInput = getDiscussionsNeedingInput(group, currentUserId);
  const inReview = group.memberships.filter((membership) => membership.status === "pending").length;
  const openTopics = group.requests.filter((request) => request.status === "open").length;

  if (inReview) {
    return `${inReview} candidate${inReview === 1 ? "" : "s"} awaiting vouches`;
  }

  if (needsInput) {
    return `${needsInput} hot signal${needsInput === 1 ? "" : "s"}`;
  }

  if (openTopics) {
    return `${openTopics} live thread${openTopics === 1 ? "" : "s"}`;
  }

  return "quiet";
}

function getRoomPriceLabel(group: Group) {
  return group.price && group.price > 0 ? `EUR ${group.price}/mo` : "free";
}

function getRoomReputation(group: Group, currentUserId: string) {
  const repliesByUser = group.requests.reduce(
    (total, request) => total + request.replies.filter((reply) => reply.senderId === currentUserId).length,
    0,
  );
  const helpfulOutcomes = group.requests.filter(
    (request) => request.status !== "open" && request.helpfulSource?.toLowerCase().includes("you"),
  ).length;

  if (repliesByUser + helpfulOutcomes >= 4) return "Strong";
  if (repliesByUser >= 1) return "Building";
  return "New";
}

function getScholarshipCopy(group: Group, currentUserId: string) {
  if (!group.price || group.price <= 0) return null;
  if (group.id === "group-founders" && currentUserId === "temp-user") return "You're a scholarship member";
  return "3 scholarship seats";
}

function getPatronCopy(group: Group) {
  if (group.price && group.price > 0) return null;
  const patrons = roomPatrons[group.id] ?? [];
  return patrons.length ? `Funded by ${patrons.length} patrons` : "Open for first patron";
}

function NavIcon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.8]">
      <path d={path} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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

  const totalInReview = useMemo(
    () =>
      prioritizedGroups.reduce(
        (total, group) => total + group.memberships.filter((membership) => membership.status === "pending").length,
        0,
      ),
    [prioritizedGroups],
  );

  const activeMemberSlotsUsed = useMemo(
    () =>
      prioritizedGroups.filter((group) =>
        group.memberships.some(
          (membership) =>
            membership.userId === currentUserId &&
            membership.status === "active" &&
            membership.role !== "owner",
        ),
      ).length,
    [currentUserId, prioritizedGroups],
  );

  const reviewRows = useMemo<ReviewRow[]>(
    () =>
      prioritizedGroups
        .map((group) => {
          const candidates = group.memberships.filter((membership) => membership.status === "pending");

          return {
            id: `review-${group.id}`,
            groupId: group.id,
            groupName: group.name,
            candidateCount: candidates.length,
          };
        })
        .filter((row) => row.candidateCount > 0),
    [prioritizedGroups],
  );

  const triageRows = useMemo((): TriageRow[] => {
    if (!currentUserId) return [];

    const rows = prioritizedGroups.flatMap((group) =>
      group.requests
        .filter((request) => request.status === "open")
        .reduce<TriageRow[]>((items, request) => {
          const userAlreadyReplied = request.replies.some((reply) => reply.senderId === currentUserId);
          if (request.creatorId === currentUserId || userAlreadyReplied) {
            return items;
          }

          const lastActivity = Math.max(
            +new Date(request.createdAt),
            ...request.replies.map((reply) => +new Date(reply.createdAt)),
          );
          const ageHours = (Date.now() - lastActivity) / (60 * 60 * 1000);
          const latestReply = request.replies.at(-1);

          items.push({
            id: `triage-${group.id}-${request.id}`,
            groupId: group.id,
            groupName: group.name,
            discussionId: request.id,
            discussionTitle: discussionTitle(request),
            startedBy: request.creator?.name || request.creator?.email || "Unknown member",
            lastActivityLabel: request.replies.length ? "needs your judgment" : "needs first reply",
            latestPreview: shortenText(latestReply?.body || request.content, 120),
            actionLabel: request.replies.length ? "Add perspective" : "Add first useful reply",
            mode: request.replies.length ? "judgment" : "first-reply",
            urgency: ageHours <= 24 ? "urgent" : request.replies.length ? "decision" : "steady",
            timestamp: lastActivity,
          });

          return items;
        }, []),
    );

    reviewRows.forEach((row) => {
      rows.push({
        id: row.id,
        groupId: row.groupId,
        groupName: row.groupName,
        discussionId: "",
        discussionTitle: `${row.candidateCount} candidate${row.candidateCount === 1 ? "" : "s"} awaiting vouches`,
        startedBy: "The room",
        lastActivityLabel: "vouching in motion",
        latestPreview: "Vouch only when you would share the room and attach your context.",
        actionLabel: "Review vouches",
        mode: "attestation",
        urgency: "decision",
        timestamp: Date.now(),
      });
    });

    return rows.sort((left, right) => right.timestamp - left.timestamp).slice(0, 6);
  }, [currentUserId, prioritizedGroups, reviewRows]);

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
            creatorName: request.creator?.name || request.creator?.email || "Room member",
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

  const rosterPath = useMemo(() => {
    const person = hotPeople.find((item) => item.rooms.size > 0) ?? hotPeople[0];
    if (!person) return "Join rooms to build warm paths across the network.";

    return `You -> ${person.name} -> ${person.rooms.values().next().value || "another room"}`;
  }, [hotPeople]);

  const aspirationItems = useMemo(() => {
    const paidTarget = groups.find((group) => group.price && group.price > 0 && group.id === "group-investments") ??
      groups.find((group) => group.price && group.price > 0);
    const follower = hotPeople[0]?.name || "three members";
    const items = [
      paidTarget
        ? `You're 1 vouch away from ${paidTarget.name}`
        : "You're 1 vouch away from a paid decision room",
      "You've been invited to curate a free room",
      `${follower} and 2 others have followed you as a patron`,
    ];

    return items;
  }, [groups, hotPeople]);

  const openHouses = useMemo(() => {
    const paidRooms = groups.filter((group) => group.price && group.price > 0).slice(0, 2);

    if (!paidRooms.length) return openHouseFallbacks;

    return paidRooms.map((group, index) => ({
      room: group.name,
      date: index === 0 ? "Dec 5" : "Dec 7",
      time: index === 0 ? "12pm EST" : "4pm CET",
      spots: index === 0 ? 48 : 12,
      brief: "1 real problem brief, identity-safe discussion, no past threads.",
    }));
  }, [groups]);

  const currentUser = useMemo(() => {
    if (!currentProfile) return null;

    return {
      id: currentProfile.id,
      email: currentProfile.email,
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

  function handleMessagesClick() {
    setFlash("Messaging inbox is coming next. For now, open a room and continue the thread there.");
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
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-[24px] border border-line bg-white px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full bg-panel px-3 py-2 text-sm font-medium text-foreground"
              >
                <NavIcon path="M4 10.5 12 4l8 6.5M6.5 9.5V20h11V9.5" />
                <span>The Floor</span>
              </Link>
              <button
                type="button"
                onClick={handleMessagesClick}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground"
              >
                <NavIcon path="M5 7.5h14v9H9l-4 3v-12Z" />
                <span>Messages</span>
              </button>
              <a
                href="#wire"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground"
              >
                <NavIcon path="M12 4.5a5 5 0 0 0-5 5V12l-1.5 2.5h13L17 12V9.5a5 5 0 0 0-5-5ZM10 18.5a2 2 0 0 0 4 0" />
                <span>The Wire</span>
              </a>
              <a
                href="#roster"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground"
              >
                <NavIcon path="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19a4.5 4.5 0 0 1 9 0M11.5 19a4.5 4.5 0 0 1 9 0" />
                <span>The Roster</span>
              </a>
              <a
                href="#ledger"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground"
              >
                <NavIcon path="M6 5.5h12M6 12h12M6 18.5h8" />
                <span>The Ledger</span>
              </a>
              <a
                href="#aspirations"
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground"
              >
                <NavIcon path="M12 19V5m0 0 5 5m-5-5-5 5" />
                <span>Aspirations</span>
              </a>
            </div>

            {currentUser ? (
              <Link
                href={`/members/${currentUser.id}`}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground"
              >
                <NavIcon path="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />
                <span>Me</span>
              </Link>
            ) : null}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trust50 · The Floor</p>
                <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your rooms. Your next table.</h1>
                <p className="mt-2 text-sm leading-7 text-muted">
                  Free rooms build reputation. Paid rooms are earned. Patrons keep the open tables alive.
                </p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  You are in {activeMemberSlotsUsed}/4 member rooms. The platform shows where your work can take you next.
                </p>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {prioritizedGroups.slice(0, 4).map((group) => {
                    const needsInput = getDiscussionsNeedingInput(group, currentUserId!);
                    const pendingVouches = group.memberships.filter((membership) => membership.status === "pending").length;
                    const heat = pendingVouches || needsInput ? `${pendingVouches + needsInput} hot` : "quiet";

                    return (
                      <Link
                        key={`floor-${group.id}`}
                        href={`/groups/${group.id}`}
                        className="rounded-2xl border border-line bg-panel px-4 py-4 transition hover:border-foreground"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-foreground">{group.name}</p>
                          <span className={heat === "quiet" ? "text-sm text-muted" : "text-sm font-medium text-rose-700"}>
                            {heat}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-muted">
                          {getRoomPriceLabel(group)} · {group.memberships.filter((membership) => membership.status === "active").length}/50 · Reputation: {getRoomReputation(group, currentUserId!)}
                        </p>
                        {getScholarshipCopy(group, currentUserId!) ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">{getScholarshipCopy(group, currentUserId!)}</p>
                        ) : getPatronCopy(group) ? (
                          <p className="mt-1 text-xs font-medium text-emerald-700">{getPatronCopy(group)}</p>
                        ) : (
                          <p className="mt-1 text-xs text-muted">{groupStatusCopy(group, currentUserId!)}</p>
                        )}
                      </Link>
                    );
                  })}
                  {!prioritizedGroups.length ? (
                    <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-4 text-sm text-muted">
                      Your rooms will appear here once you join the floor.
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4 lg:w-[270px]">
                <div className="flex flex-wrap gap-2 lg:justify-end">
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

                {currentUser ? (
                  <div className="rounded-2xl border border-line bg-panel p-4">
                    <div className="flex items-start gap-3">
                      {currentUser.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={currentUser.avatarUrl}
                          alt={currentUser.name || "Current user"}
                          className="h-14 w-14 rounded-2xl object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-lg font-semibold text-white">
                          {(currentUser.name || currentUser.email).slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{currentUser.name || currentUser.email}</p>
                        <p className="mt-1 text-sm text-muted">{currentUser.headline || "Trust50 member"}</p>
                        <p className="mt-2 text-xs text-muted">
                          {currentUser.helpfulRepliesCount} helpful repl{currentUser.helpfulRepliesCount === 1 ? "y" : "ies"} recently
                        </p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Your rooms</h2>
                <p className="mt-1 text-sm text-muted">Private tables ordered by live signal.</p>
              </div>
              <Link
                href="/explore-groups"
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Browse rooms
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {!prioritizedGroups.length ? (
                <p className="text-sm text-muted">You are not in any rooms yet.</p>
              ) : (
                prioritizedGroups.slice(0, 4).map((group) => {
                  const needsInput = getDiscussionsNeedingInput(group, currentUserId!);
                  const statusCopy = groupStatusCopy(group, currentUserId!);

                  return (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-4 transition hover:border-foreground"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{group.name}</p>
                        <p className="mt-1 text-sm text-muted">{statusCopy}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            needsInput || group.memberships.some((membership) => membership.status === "pending")
                              ? "bg-emerald-500"
                              : "bg-stone-900"
                          }`}
                        />
                        <span className="text-sm font-medium text-foreground">
                          {needsInput ? "Hot" : "Open"}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </section>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.8fr]">
          <div className="space-y-6">

          {flash ? (
            <div className="rounded-2xl border border-line bg-white px-5 py-3 text-sm text-muted shadow-sm">
              {flash}
            </div>
          ) : null}

          {!loading && !prioritizedGroups.length ? (
            <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
              <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-4 text-sm text-muted">
                <p className="font-medium text-foreground">You are not in any rooms yet.</p>
                <p className="mt-1">Browse rooms and request access, or create the first room you want to run.</p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <Link
                    href="/explore-groups"
                    className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                  >
                    Browse available rooms
                  </Link>
                  <Link
                    href="/start-a-group"
                    className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                  >
                    Start a group
                  </Link>
                </div>
              </div>
            </section>
          ) : null}

          <section id="aspirations" className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">Aspirations</h2>
                <p className="mt-1 text-sm text-muted">
                  Earned paths forward. No upgrade buttons, just reputation turning into invitations.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-800">
                {currentUser?.trustLevel || "Building"}
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {aspirationItems.map((item) => (
                <div key={item} className="rounded-2xl border border-line bg-panel px-4 py-4">
                  <p className="text-sm font-medium text-foreground">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-4">
              <p className="text-sm font-medium text-foreground">Graduation moment</p>
              <p className="mt-2 text-sm text-muted">
                Paid rooms unlock when reputation, vouches, and helpful replies line up. Scholarship seats keep price from becoming the only gate.
              </p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted">
                <span className="rounded-full bg-white px-3 py-1">3 months in a free room</span>
                <span className="rounded-full bg-white px-3 py-1">2 vouches</span>
                <span className="rounded-full bg-white px-3 py-1">4 helpful replies</span>
              </div>
            </div>
          </section>

          <section id="wire" className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold">The Wire</h2>
                <p className="mt-1 text-sm text-muted">
                  Lightweight judgment from your rooms. Handle it, pass, or leave a signal for later.
                </p>
              </div>

              <span className="rounded-full bg-rose-100 px-4 py-2 text-sm font-medium text-rose-800">
                {triageRows.length} thing{triageRows.length === 1 ? "" : "s"} need you
              </span>
            </div>

            <div className="mt-5 space-y-3">
              {!triageRows.length ? <p className="text-sm text-muted">The wire is quiet right now.</p> : null}

              {triageRows.map((item) => (
                <Link
                  key={item.id}
                  href={item.discussionId ? `/groups/${item.groupId}/discussions/${item.discussionId}` : `/groups/${item.groupId}/votes`}
                  className={`block rounded-2xl border px-4 py-4 transition hover:-translate-y-0.5 hover:shadow-sm ${
                    item.urgency === "urgent"
                      ? "border-rose-200 bg-rose-50/70"
                      : item.urgency === "decision"
                        ? "border-amber-200 bg-amber-50/70"
                        : "border-line bg-panel"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">{item.groupName}</p>
                      <p className="mt-1 text-sm font-medium text-foreground">
                        {item.mode === "attestation" ? "Awaiting room vouches" : `${item.startedBy} opened a signal`}
                      </p>
                    </div>
                    <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-foreground">
                      {item.mode === "attestation"
                        ? "Vouch"
                        : item.mode === "first-reply"
                          ? "First mover"
                          : "Judgment"}
                    </span>
                  </div>
                  <p className="mt-3 text-[15px] font-medium leading-6 text-foreground">&ldquo;{item.discussionTitle}&rdquo;</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {item.mode === "first-reply" ? "Nobody has replied yet. First mover signal available." : `Latest: "${item.latestPreview}"`}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span className="rounded-full bg-white px-3 py-1">{item.actionLabel}</span>
                    <span className="rounded-full bg-white px-3 py-1">Pass</span>
                    <span className="rounded-full bg-white px-3 py-1">Signal later</span>
                    <span>{item.lastActivityLabel}</span>
                    <span>{urgencyLabel(item.urgency)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {recentOutcomes.length ? (
            <section id="ledger" className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">The Ledger</h2>
              <p className="mt-1 text-sm text-muted">Proof that rooms are creating movement, not just messages.</p>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {recentOutcomes.map((item) => (
                  <Link
                    key={item.id}
                    href={`/groups/${item.groupId}/discussions/${item.id}`}
                    className="rounded-2xl border border-line bg-panel px-4 py-4 transition hover:border-foreground"
                  >
                    <p className="font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 text-sm text-muted">{item.outcome}</p>
                    <p className="mt-2 text-xs font-medium text-foreground">Shared by {item.creatorName}</p>
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">Vouching</h2>
                <p className="mt-1 text-sm text-muted">Social capital in motion. Context beats yes/no.</p>
              </div>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
                {totalInReview}
              </span>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
              <p className="text-sm font-medium text-foreground">
                {totalInReview
                  ? `${totalInReview} candidate${totalInReview === 1 ? "" : "s"} awaiting vouches across your rooms.`
                  : "No candidates are waiting for vouches."}
              </p>
              <p className="mt-2 text-sm text-muted">
                Vouch only when you can add context the room can trust.
              </p>
              {reviewRows[0] ? (
                <Link
                  href={`/groups/${reviewRows[0].groupId}/votes`}
                  className="mt-3 inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  Open vouch queue
                </Link>
              ) : null}
            </div>
          </section>

          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Signal Map</h2>
            <p className="mt-1 text-sm text-muted">People leaning in across your rooms.</p>

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
            <h2 className="text-xl font-semibold">Open Houses</h2>
            <p className="mt-1 text-sm text-muted">A taste of paid-room quality without exposing the private room.</p>

            <div className="mt-5 space-y-3">
              {openHouses.map((house) => (
                <div key={`${house.room}-${house.date}`} className="rounded-2xl border border-line bg-panel px-4 py-4">
                  <p className="font-medium text-foreground">{house.room}</p>
                  <p className="mt-1 text-sm text-muted">
                    {house.date}, {house.time} · {house.spots} spots left
                  </p>
                  <p className="mt-2 text-sm text-muted">{house.brief}</p>
                  <button
                    type="button"
                    onClick={() => setFlash(`Registered interest for ${house.room} Open House.`)}
                    className="mt-3 rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                  >
                    Register free
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section id="roster" className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">The Roster</h2>
            <p className="mt-1 text-sm text-muted">Who can get you where, without cold search.</p>
            <div className="mt-5 rounded-2xl border border-line bg-panel px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Warm path</p>
              <p className="text-sm font-medium text-foreground">
                {rosterPath}
              </p>
              <p className="mt-2 text-sm text-muted">
                Ask in the room where trust is strongest first. The second hop is usually warmer than a directory.
              </p>
              {hotPeople[0] ? (
                <Link
                  href={`/members/${hotPeople[0].id}`}
                  className="mt-3 inline-flex rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  View strongest path
                </Link>
              ) : null}
            </div>
          </section>

        </aside>
      </div>
    </div>
    </main>
  );
}
