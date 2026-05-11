"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import {
  SAMPLE_ROOM_TAXONOMY,
  TRUST_TAXONOMY,
  fallbackRoomTaxonomy,
  taxonomySearchText,
  type RoomTaxonomy,
  type TrustDomain,
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
  status: string;
  outcome?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  replies?: unknown[];
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
};

const preferredGapDomains: TrustDomain[] = ["Local", "Learning", "Family", "Wellness", "Pursuits"];

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
  return "Quiet";
}

function connectionLabel(group: Group, memberRooms: Group[]) {
  const taxonomy = getRoomTaxonomy(group);
  const relatedRooms = memberRooms.filter((room) => {
    const roomTaxonomy = getRoomTaxonomy(room);
    return roomTaxonomy.domain === taxonomy.domain || roomTaxonomy.category === taxonomy.category;
  }).length;

  if (relatedRooms === 0) return "Connected to your rooms";
  return `${relatedRooms} of your room${relatedRooms === 1 ? "" : "s"} connect here`;
}

function specialtyLabel(taxonomy: RoomTaxonomy) {
  return taxonomy.specialty.replace(/\s+/g, " ").trim();
}

function hiddenReason(group: Group) {
  if (group.id === "group-women-pharma") {
    return "This room is for women leaders in pharma. Your current profile does not match that entry signal.";
  }

  return "Your current profile does not match this room's entry signal.";
}

function suggestionScore(group: Group, memberRooms: Group[], activeFilter: string) {
  const taxonomy = getRoomTaxonomy(group);
  const memberDomains = new Set(memberRooms.map((room) => getRoomTaxonomy(room).domain));
  const memberCategories = new Set(memberRooms.map((room) => getRoomTaxonomy(room).category));
  let score = 0;

  if (taxonomy.domain === activeFilter || taxonomy.category === activeFilter) score += 50;
  if (!memberDomains.has(taxonomy.domain)) score += 25;
  if (memberCategories.has(taxonomy.category)) score += 15;
  if (!group.price || group.price <= 0) score += 8;
  score += Math.max(0, 50 - group.memberCount) / 10;

  return score;
}

export default function ExploreGroupsPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<TrustDomain | "All">("All");

  const currentUserId = session?.user?.id ?? null;
  const displayName = session?.user?.name || session?.user?.email?.split("@")[0] || "Member";

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setFlash(null);

      try {
        const response = await fetch("/api/groups");
        const data = (await response.json()) as Group[] | { error?: string };

        if (!response.ok) {
          throw new Error(("error" in data && data.error) || "Unable to load rooms.");
        }

        setGroups(data as Group[]);
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Unable to load rooms.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const memberRooms = useMemo(
    () =>
      groups.filter((group) => {
        const membership = getMembership(group, currentUserId);
        return membership?.status === "active" && membership.role !== "owner";
      }),
    [currentUserId, groups],
  );

  const memberDomains = useMemo(
    () => new Set(memberRooms.map((group) => getRoomTaxonomy(group).domain)),
    [memberRooms],
  );

  const gapFilters = useMemo(() => {
    const missing = preferredGapDomains.filter((domain) => !memberDomains.has(domain));
    const fallback = TRUST_TAXONOMY.map((node) => node.domain).filter((domain) => !missing.includes(domain));
    return [...missing, ...fallback].slice(0, 5);
  }, [memberDomains]);

  const suggestedGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return groups
      .filter((group) => group.status === "active" || group.status === "emerging")
      .filter((group) => getMembership(group, currentUserId)?.status !== "active")
      .filter((group) => group.id !== "group-women-pharma")
      .filter((group) => {
        const taxonomy = getRoomTaxonomy(group);
        const aliases = searchAliases[group.id]?.join(" ") || "";
        const haystack = `${group.name} ${group.owner.name || ""} ${group.description || ""} ${group.whoFor} ${group.valueProp} ${taxonomySearchText(taxonomy)} ${aliases}`.toLowerCase();
        const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);
        const matchesFilter = activeFilter === "All" || taxonomy.domain === activeFilter || taxonomy.category === activeFilter;

        return matchesQuery && matchesFilter;
      })
      .sort((left, right) => suggestionScore(right, memberRooms, activeFilter) - suggestionScore(left, memberRooms, activeFilter))
      .slice(0, 5);
  }, [activeFilter, currentUserId, groups, memberRooms, query]);

  const excludedRooms = useMemo(
    () =>
      groups
        .filter((group) => group.id === "group-women-pharma")
        .filter((group) => getMembership(group, currentUserId)?.status !== "active"),
    [currentUserId, groups],
  );

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Trust50</p>
            <p className="truncate text-sm text-muted">{displayName}</p>
          </div>
          <nav className="flex items-center gap-1 text-xs font-medium">
            <Link href="/" className="rounded-xl px-3 py-2 text-muted transition hover:bg-panel hover:text-foreground">
              Wire
            </Link>
            <Link href="/explore-groups" className="rounded-xl bg-foreground px-3 py-2 text-white">
              Rooms
            </Link>
            {currentUserId ? (
              <Link href={`/members/${currentUserId}`} className="rounded-xl px-3 py-2 text-muted transition hover:bg-panel hover:text-foreground">
                Me
              </Link>
            ) : null}
          </nav>
        </header>

        {flash ? (
          <div className="rounded-2xl border border-line bg-white px-5 py-3 text-sm text-muted shadow-sm">
            {flash}
          </div>
        ) : null}

        {!currentUserId && status !== "loading" ? (
          <section className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
            <p className="text-sm text-muted">Sign in to see your slots and suggested rooms.</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Your slots</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{memberRooms.length}/4 rooms used</h1>
            </div>
            <span className="rounded-full bg-panel px-3 py-1.5 text-xs font-medium text-muted">
              Fill the gap
            </span>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">Loading rooms...</div>
            ) : null}

            {!loading && !memberRooms.length ? (
              <div className="rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">
                No rooms yet. Start with one room where your context can actually help.
              </div>
            ) : null}

            {memberRooms.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="block rounded-2xl border border-line bg-panel px-4 py-3 transition hover:border-foreground"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{group.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {priceLabel(group.price)} / {group.memberCount} members
                    </p>
                  </div>
                  <p className="shrink-0 text-right text-xs font-medium text-muted">{roomActivity(group, currentUserId)}</p>
                </div>
              </Link>
            ))}

            {memberRooms.length < 4 ? (
              <button
                type="button"
                onClick={() => document.getElementById("find-room")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="w-full rounded-2xl border border-dashed border-line bg-white px-4 py-4 text-left text-sm font-medium text-foreground transition hover:border-foreground"
              >
                + Add {memberRooms.length ? "next" : "first"} room
              </button>
            ) : null}

            <Link
              href="/start-a-group"
              className="block rounded-2xl border border-dashed border-line bg-white px-4 py-4 text-sm font-medium text-foreground transition hover:border-foreground"
            >
              + Start a new room
            </Link>
          </div>
        </section>

        <section id="find-room" className="rounded-[20px] border border-line bg-white p-5 shadow-sm">
          <h2 className="text-xl font-semibold tracking-tight">What kind of room are you missing?</h2>

          <label className="mt-4 block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Search by keyword</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-foreground"
              placeholder="AI, property, investing, Warsaw..."
            />
          </label>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {gapFilters.map((domain) => (
              <button
                key={domain}
                type="button"
                onClick={() => setActiveFilter(domain)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeFilter === domain
                    ? "bg-foreground text-white"
                    : "border border-line bg-white text-muted hover:border-foreground hover:text-foreground"
                }`}
              >
                {domain}
              </button>
            ))}
          </div>

          <div className="mt-5 space-y-3">
            {suggestedGroups.map((group) => {
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
                        href={membership ? `/groups/${group.id}/apply` : `/groups/${group.id}/apply`}
                        className="rounded-full border border-line bg-white px-4 py-2 text-center text-sm font-medium text-foreground transition hover:border-foreground"
                      >
                        {actionLabel}
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}

            {!loading && !suggestedGroups.length ? (
              <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-5 text-sm text-muted">
                No suggested rooms match that gap yet. Try keyword search or start the room yourself.
              </div>
            ) : null}
          </div>

          {excludedRooms.length ? (
            <div className="mt-5 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">Not suggested</p>
              {excludedRooms.map((group) => {
                const taxonomy = getRoomTaxonomy(group);

                return (
                  <article key={group.id} className="rounded-2xl border border-line bg-white px-4 py-4 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-foreground">{group.name}</h3>
                        <p className="mt-1 text-muted">
                          {priceLabel(group.price)} / {group.memberCount}/50
                        </p>
                        <p className="mt-2 line-clamp-2 text-foreground">{specialtyLabel(taxonomy)}</p>
                        <p className="mt-1 text-xs text-muted">{group.owner.name || group.owner.email}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-panel px-3 py-1.5 text-xs font-medium text-muted">
                        Does not match
                      </span>
                    </div>
                    <details className="mt-3 text-xs text-muted">
                      <summary className="cursor-pointer font-medium text-foreground">Why?</summary>
                      <p className="mt-2 leading-5">{hiddenReason(group)}</p>
                    </details>
                  </article>
                );
              })}
            </div>
          ) : null}
        </section>

        <nav className="sticky bottom-4 grid grid-cols-3 overflow-hidden rounded-full border border-line bg-white p-1 shadow-sm">
          <Link href="/" className="rounded-full px-4 py-2 text-center text-sm font-medium text-muted transition hover:bg-panel hover:text-foreground">
            Wire
          </Link>
          <Link href="/explore-groups" className="rounded-full bg-foreground px-4 py-2 text-center text-sm font-medium text-white">
            Rooms
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
