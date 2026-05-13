"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { AppTopNav } from "@/components/AppTopNav";
import {
  SAMPLE_ROOM_TAXONOMY,
  fallbackRoomTaxonomy,
  taxonomySearchText,
  type RoomTaxonomy,
} from "@/lib/taxonomy";

type User = {
  id: string;
  name: string | null;
  email: string;
};

type Membership = {
  id: string;
  userId: string;
  role: string;
  status: string;
};

type Request = {
  id: string;
  creatorId?: string;
  status: string;
  outcome?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  replies?: { senderId?: string }[];
};

type TrustLink = {
  id: string;
  giverUserId: string;
  receiverUserId: string;
  roomId: string;
  status: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  whoFor: string;
  whoNotFor: string;
  valueProp: string;
  price: number | null;
  status: string;
  memberCount: number;
  owner: User;
  memberships: Membership[];
  requests?: Request[];
  trustLinks?: TrustLink[];
};

const searchAliases: Record<string, string[]> = {
  "group-women-pharma": ["pharma", "health", "clinical", "medical", "biotech"],
  "group-digital-pharma": ["pharma", "health", "ai", "digital", "data", "clinical"],
  "group-health-ai": ["pharma", "health", "ai", "medical", "founder"],
  "group-property-management": ["property", "real estate", "ops", "local"],
  "group-investments": ["investing", "finance", "capital", "cfo", "risk"],
  "group-music-production": ["creative", "music", "audio", "sync"],
  "group-dog-training": ["professional services", "training", "behavior"],
};

function priceLabel(price: number | null) {
  return price && price > 0 ? `EUR ${price}/mo` : "Free";
}

function getMembership(group: Group, userId: string | null) {
  if (!userId) return null;
  return group.memberships.find((membership) => membership.userId === userId) ?? null;
}

function isUsedSlotStatus(status?: string) {
  return status === "active" || status === "pending" || status === "waitlist" || status === "invited";
}

function queueLabel(status?: string) {
  if (status === "pending") return "In review";
  if (status === "invited") return "Invited";
  if (status === "waitlist") return "In queue";
  return "Joined";
}

function getRoomTaxonomy(group: Group): RoomTaxonomy {
  return SAMPLE_ROOM_TAXONOMY[group.id] ?? fallbackRoomTaxonomy(`${group.name} ${group.description || ""} ${group.whoFor} ${group.valueProp}`);
}

function roomActivity(group: Group, currentUserId: string | null) {
  const membership = getMembership(group, currentUserId);
  if (!membership || membership.status !== "active") return "Preview only";

  const openRequests = (group.requests ?? []).filter((request) => request.status === "open");
  const pendingMembers = group.memberships.filter((entry) => entry.status === "pending").length;

  if (pendingMembers) return `${pendingMembers} candidate${pendingMembers === 1 ? "" : "s"} need vouches`;
  if (openRequests.length) return `${openRequests.length} signal${openRequests.length === 1 ? "" : "s"} need you`;
  return "Awaiting signals - add a decision to wake it up";
}

function circleContribution(group: Group, currentUserId: string | null) {
  if (!currentUserId) return "";

  const decisionCount = (group.requests ?? []).filter(
    (request) =>
      request.creatorId === currentUserId ||
      (request.replies ?? []).some((reply) => reply.senderId === currentUserId),
  ).length;
  const trustedHere = (group.trustLinks ?? []).filter((link) => link.receiverUserId === currentUserId).length;
  const parts = [
    decisionCount ? `You gave ${decisionCount} decision${decisionCount === 1 ? "" : "s"}` : null,
    trustedHere ? `Trusted by ${trustedHere} here` : null,
  ].filter(Boolean);

  return parts.join(" / ");
}

function circleTrustLevel(group: Group, currentUserId: string | null) {
  if (!currentUserId) return "Trust level 00 / 200 - Building trust";

  const trustedHere = (group.trustLinks ?? []).filter((link) => link.receiverUserId === currentUserId).length;
  const label =
    trustedHere >= 151
      ? "Exceptional"
      : trustedHere >= 101
        ? "Deeply trusted"
        : trustedHere >= 51
          ? "Respected"
          : trustedHere >= 21
            ? "Trusted"
            : "Building trust";

  return `Trust level ${String(Math.min(trustedHere, 200)).padStart(2, "0")} / 200 - ${label}`;
}

function connectionLabel(group: Group, memberRooms: Group[]) {
  const taxonomy = getRoomTaxonomy(group);
  const relatedRooms = memberRooms.filter((room) => {
    const roomTaxonomy = getRoomTaxonomy(room);
    return roomTaxonomy.domain === taxonomy.domain || roomTaxonomy.category === taxonomy.category;
  }).length;

  if (relatedRooms === 0) return "Connected to your circles";
  return `${relatedRooms} of your circle${relatedRooms === 1 ? "" : "s"} connect here`;
}

function specialtyLabel(taxonomy: RoomTaxonomy) {
  return taxonomy.specialty.replace(/\s+/g, " ").trim();
}

function tokenizeSearch(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => token.length > 1);
}

function searchHaystack(group: Group) {
  const taxonomy = getRoomTaxonomy(group);
  const aliases = searchAliases[group.id]?.join(" ") || "";
  return `${group.name} ${group.owner.name || ""} ${group.description || ""} ${group.whoFor} ${group.valueProp} ${taxonomySearchText(taxonomy)} ${aliases}`.toLowerCase();
}

function queryMatchScore(group: Group, query: string) {
  const tokens = tokenizeSearch(query);
  if (!tokens.length) return 0;

  const haystack = searchHaystack(group);
  return tokens.reduce((score, token) => score + (haystack.includes(token) ? 1 : 0), 0);
}

export default function ExploreGroupsPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  const currentUserId = session?.user?.id ?? null;

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setFlash(null);

      try {
        const response = await fetch("/api/groups");
        const data = (await response.json()) as Group[] | { error?: string };

        if (!response.ok) {
          throw new Error(("error" in data && data.error) || "Unable to load circles.");
        }

        setGroups(data as Group[]);
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Unable to load circles.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const usedCircles = useMemo(
    () =>
      groups.filter((group) => {
        const membership = getMembership(group, currentUserId);
        return membership?.role !== "owner" && isUsedSlotStatus(membership?.status);
      }),
    [currentUserId, groups],
  );

  const memberRooms = useMemo(
    () =>
      usedCircles.filter((group) => {
        const membership = getMembership(group, currentUserId);
        return membership?.status === "active";
      }),
    [currentUserId, usedCircles],
  );

  const normalizedQuery = query.trim();
  const queryTokens = useMemo(() => tokenizeSearch(normalizedQuery), [normalizedQuery]);
  const hasSearch = queryTokens.length > 0;

  const candidateGroups = useMemo(
    () =>
      groups
        .filter((group) => group.status === "active" || group.status === "emerging")
        .filter((group) => getMembership(group, currentUserId)?.status !== "active")
        .filter((group) => group.id !== "group-women-pharma"),
    [currentUserId, groups],
  );

  const strongMatches = useMemo(() => {
    if (!hasSearch) return [];
    return candidateGroups
      .filter((group) => queryMatchScore(group, normalizedQuery) > 0)
      .sort((left, right) => queryMatchScore(right, normalizedQuery) - queryMatchScore(left, normalizedQuery))
      .slice(0, 8);
  }, [candidateGroups, hasSearch, normalizedQuery]);

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <AppTopNav activeTab="circles" currentUserId={currentUserId} />

        {flash ? (
          <div className="rounded-2xl border border-line bg-white px-5 py-3 text-sm text-muted shadow-sm">
            {flash}
          </div>
        ) : null}

        {!currentUserId && status !== "loading" ? (
          <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">Sign in to see your slots and suggested trust circles.</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link href="/" className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
                Sign in
              </Link>
              <Link href="/register" className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground">
                Create account
              </Link>
            </div>
          </section>
        ) : null}

        <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Your circles</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{usedCircles.length}/4 used</h1>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">Loading circles...</div>
            ) : null}

            {!loading && !usedCircles.length ? (
              <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">
                No circles yet. Start with one trust circle where your context can actually help.
              </div>
            ) : null}

            {usedCircles.map((group) => {
              const membership = getMembership(group, currentUserId);
              const isActive = membership?.status === "active";
              return (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block rounded-2xl border border-line bg-panel px-4 py-3 transition hover:border-foreground"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                    {isActive ? (
                      <>
                        <p className="mt-1 text-xs font-medium text-muted">{roomActivity(group, currentUserId)}</p>
                        <p className="mt-1 text-xs text-muted">{circleTrustLevel(group, currentUserId)}</p>
                        {circleContribution(group, currentUserId) ? (
                          <p className="mt-1 text-xs text-muted">{circleContribution(group, currentUserId)}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="mt-1 text-xs font-medium text-amber-700">{queueLabel(membership?.status)}</p>
                    )}
                  </div>
                </div>
              </Link>
              );
            })}

            <Link
              href="/start-a-group"
              className="block rounded-2xl border border-dashed border-line bg-white px-4 py-4 text-sm font-medium text-foreground transition hover:border-foreground"
            >
              + Start a new circle
            </Link>
          </div>
        </section>

        <section id="find-room" className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight">What kind of circle are you missing?</h2>

          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Search</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-foreground"
              placeholder="founders in Warsaw for toys"
            />
          </label>

          <div className="mt-5 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {hasSearch ? `Circles matching "${normalizedQuery}"` : "Start or search"}
            </p>
            {!hasSearch ? (
              <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-5 text-sm text-muted">
                <p className="font-medium text-foreground">Start a new circle or search for an existing one.</p>
                <p className="mt-1">We only show circles when you search, so discovery stays intentional and clean.</p>
              </div>
            ) : null}
            {strongMatches.map((group) => {
              const membership = getMembership(group, currentUserId);
              const taxonomy = getRoomTaxonomy(group);
              const actionLabel =
                membership?.status === "waitlist"
                  ? "In queue"
                  : membership?.status === "pending"
                    ? "In review"
                    : "Request";

              return (
                <article key={group.id} className="rounded-2xl border border-line bg-panel px-4 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-semibold text-foreground">{group.name}</h3>
                      <p className="mt-1 text-sm text-muted">
                        {priceLabel(group.price)} / {group.memberCount}/50
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm text-foreground">
                        {specialtyLabel(taxonomy)}
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {group.owner.name || group.owner.email} / {connectionLabel(group, memberRooms)}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col gap-2">
                      <Link
                        href={`/groups/${group.id}`}
                        className="rounded-full bg-foreground px-4 py-2 text-center text-sm font-medium text-white transition hover:opacity-90"
                      >
                        Preview
                      </Link>
                      <Link
                        href={`/groups/${group.id}/apply`}
                        className="rounded-full border border-line bg-white px-4 py-2 text-center text-sm font-medium text-foreground transition hover:border-foreground"
                      >
                        {actionLabel}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}

            {!loading && !strongMatches.length ? (
              <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-5 text-sm text-muted">
                <p className="font-medium text-foreground">
                  {hasSearch ? `No circles match "${normalizedQuery}" yet.` : "No circles shown yet."}
                </p>
                <p className="mt-1">Start one for this gap, or search for a broader context.</p>
                <Link
                  href={hasSearch ? `/start-a-group?name=${encodeURIComponent(normalizedQuery)}` : "/start-a-group"}
                  className="mt-4 inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  {hasSearch ? `Start a circle - "${normalizedQuery}"` : "Start a circle for this gap"}
                </Link>
              </div>
            ) : null}
          </div>
        </section>

        <nav className="sticky bottom-4 grid grid-cols-3 overflow-hidden rounded-full border border-line bg-white p-1 shadow-sm">
          <Link href="/explore-groups" className="rounded-full bg-foreground px-4 py-2 text-center text-sm font-medium text-white">
            Circles
          </Link>
          <Link href="/" className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground">
            Wire
          </Link>
          {currentUserId ? (
            <Link href={`/members/${currentUserId}`} className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground">
              Me
            </Link>
          ) : (
            <span className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted">Me</span>
          )}
        </nav>
      </div>
    </main>
  );
}
