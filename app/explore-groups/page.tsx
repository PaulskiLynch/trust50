"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

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

const filterChips = [
  "All",
  "Founder/operator",
  "Pharma/health",
  "Creative",
  "Local",
  "Investing",
  "Professional services",
  "Free",
  "Paid",
  "Has open seats",
];

const roomTagMap: Record<string, string[]> = {
  "group-founders": ["Founder/operator", "Local"],
  "group-operators": ["Founder/operator", "Professional services"],
  "group-women-pharma": ["Pharma/health", "Professional services"],
  "group-digital-pharma": ["Pharma/health", "Professional services"],
  "group-health-ai": ["Pharma/health", "Founder/operator"],
  "group-property-management": ["Professional services", "Local"],
  "group-investments": ["Investing"],
  "group-dog-training": ["Professional services", "Creative"],
  "group-music-production": ["Creative"],
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
  return price && price > 0 ? `EUR ${price}/month` : "Free";
}

function initials(value: string | null | undefined) {
  const source = value?.trim() || "Trust50";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getMembership(group: Group, userId: string | null) {
  if (!userId) return null;
  return group.memberships.find((membership) => membership.userId === userId) ?? null;
}

function oneLine(value: string, limit = 96) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > limit ? `${compact.slice(0, limit - 3)}...` : compact;
}

function recentAsks(group: Group) {
  const text = `${group.id} ${group.name} ${group.description || ""} ${group.whoFor} ${group.valueProp}`.toLowerCase();

  if (text.match(/pharma|health|clinical|medical|biotech/)) {
    return ["AI adoption inside regulated teams", "Clinical workflow buy-in", "Evidence that moves committees"];
  }

  if (text.match(/invest|fund|capital|cfo|finance|risk/)) {
    return ["Underwriting the risk others missed", "Warm CFO paths", "When to pass on a deal"];
  }

  if (text.match(/warsaw|founder|startup|series|product|hiring/)) {
    return ["First senior hire in Warsaw", "Founder-led GTM", "When advisors become noise"];
  }

  if (text.match(/property|management|ops|operator/)) {
    return ["Promoting strong onsite managers", "Concessions versus hold rate", "Overflow maintenance models"];
  }

  if (text.match(/creative|music|audio|producer|sync/)) {
    return ["Pricing creative retainers", "Sync deal quality", "Trusted collaborator lists"];
  }

  return ["Warm intros that worked", "Decisions members are facing", "Who can help this week"];
}

function fitSignal(group: Group, tags: string[], activeFilter: string, query: string, waitingCount: number) {
  const normalizedQuery = query.trim().toLowerCase();

  if (waitingCount >= 30) return "Hard to enter";
  if (activeFilter !== "All" && tags.includes(activeFilter)) return "Strong fit";
  if (normalizedQuery && `${group.name} ${group.description || ""} ${tags.join(" ")}`.toLowerCase().includes(normalizedQuery)) {
    return "Likely fit";
  }
  if (tags.includes("Founder/operator")) return "Founder-heavy";
  if (tags.includes("Pharma/health")) return "Specialist room";
  return "Selective";
}

function groupTags(group: Group) {
  const text = `${group.id} ${group.name} ${group.description || ""} ${group.whoFor} ${group.valueProp}`.toLowerCase();
  const tags = new Set<string>();

  roomTagMap[group.id]?.forEach((tag) => tags.add(tag));

  if (text.match(/founder|operator|startup|series|product|hiring|growth/)) tags.add("Founder/operator");
  if (text.match(/pharma|health|clinical|medical|biotech|ai/)) tags.add("Pharma/health");
  if (text.match(/creative|music|audio|producer|sync|dog|training/)) tags.add("Creative");
  if (text.match(/warsaw|berlin|paris|latam|europe|local|property/)) tags.add("Local");
  if (text.match(/invest|fund|capital|cfo|finance|risk/)) tags.add("Investing");
  if (text.match(/ops|professional|services|management|regulatory|data/)) tags.add("Professional services");

  tags.add(group.price && group.price > 0 ? "Paid" : "Free");
  if (group.memberCount < 50) tags.add("Has open seats");

  return [...tags];
}

export default function ExploreGroupsPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  const currentUserId = session?.user?.id ?? null;

  const activeMemberSlotsUsed = useMemo(
    () =>
      groups.filter((group) => {
        const membership = getMembership(group, currentUserId);
        return membership?.status === "active" && membership.role !== "owner";
      }).length,
    [currentUserId, groups],
  );

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

  const liveGroups = useMemo(
    () =>
      groups.filter((group) => {
        if (!(group.status === "active" || group.status === "emerging")) return false;

        const membership = getMembership(group, currentUserId);
        return !(membership?.status === "active");
      }),
    [currentUserId, groups],
  );

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return liveGroups.filter((group) => {
      const tags = groupTags(group);
      const matchesFilter = activeFilter === "All" || tags.includes(activeFilter);
      const aliases = searchAliases[group.id]?.join(" ") || "";
      const haystack = `${group.id} ${group.name} ${group.owner.name || ""} ${group.owner.email} ${group.description || ""} ${group.whoFor} ${group.whoNotFor} ${group.valueProp} ${tags.join(" ")} ${aliases}`.toLowerCase();
      const matchesQuery = !normalizedQuery || haystack.includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [activeFilter, liveGroups, query]);

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>Explore rooms</p>
          <Link href={currentUserId ? "/" : "/landing"} className="font-medium transition hover:text-foreground">
            {currentUserId ? "Back to Wire" : "Back to landing page"}
          </Link>
        </div>

        <section className="rounded-[24px] border border-line bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight">Find the rooms worth one of your four slots</h1>
              <p className="text-sm leading-7 text-muted">
                Browse live Trust50 rooms by fit, activity, and how hard they are to enter.
              </p>
            </div>
            <div className="shrink-0 rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-foreground">
              {activeMemberSlotsUsed}/4 slots used
            </div>
          </div>
        </section>

        <section className="sticky top-4 z-10 rounded-[20px] border border-line bg-white/95 p-4 shadow-sm backdrop-blur">
          <label className="block">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-full border border-line bg-white px-4 py-2.5 text-sm outline-none transition focus:border-foreground"
              placeholder="Search rooms by decision, industry, city, or role"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {filterChips.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveFilter(chip)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  activeFilter === chip
                    ? "bg-foreground text-white"
                    : "border border-line bg-white text-muted hover:border-foreground hover:text-foreground"
                }`}
              >
                {chip}
              </button>
            ))}
          </div>
        </section>

        {flash ? (
          <div className="rounded-2xl border border-line bg-white px-5 py-3 text-sm text-muted shadow-sm">
            {flash}
          </div>
        ) : null}

        {!currentUserId && status !== "loading" ? (
          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <p className="text-sm text-muted">
              Sign in to request access, track your queue status, or start a room of your own.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Create account
              </Link>
            </div>
          </section>
        ) : null}

        <section className="space-y-4">
          {loading ? (
            <div className="rounded-[28px] border border-line bg-white px-6 py-8 text-sm text-muted shadow-sm">
              Loading rooms...
            </div>
          ) : null}

          {!loading && !filteredGroups.length ? (
            <div className="rounded-[28px] border border-line bg-white px-6 py-8 text-sm text-muted shadow-sm">
              No rooms match that search yet.
            </div>
          ) : null}

          {filteredGroups.map((group) => {
            const membership = getMembership(group, currentUserId);
            const waitlistCount = group.memberships.filter((entry) => entry.status === "waitlist").length;
            const pendingCount = group.memberships.filter((entry) => entry.status === "pending").length;
            const outcomesThisMonth = (group.requests ?? []).filter(
              (request) =>
                request.status !== "open" &&
                request.outcome &&
                Date.now() - new Date(request.resolvedAt || request.createdAt).getTime() < 30 * 24 * 60 * 60 * 1000,
            ).length;
            const activeThreadCount = (group.requests ?? []).filter((request) => request.status === "open").length;
            const slotsFull = activeMemberSlotsUsed >= 4;
            const tags = groupTags(group);
            const waitingCount = waitlistCount + pendingCount;
            const difficultySignal = waitlistCount || pendingCount ? `${waitlistCount + pendingCount} waiting` : "Open seats";
            const activitySignal =
              activeThreadCount >= 3
                ? "4 conversations today"
                : outcomesThisMonth
                  ? `${outcomesThisMonth} outcomes this month`
                  : group.status === "active"
                    ? "Fast replies"
                    : "New room";
            const peopleSignal = `Run by ${group.owner.name || group.owner.email}`;
            const asks = recentAsks(group);
            const roomFitSignal = fitSignal(group, tags, activeFilter, query, waitingCount);

            let action: { href: string; label: string; secondary?: boolean };

            if (membership?.role === "owner") {
              action = { href: `/owner/groups/${group.id}`, label: "Manage room" };
            } else if (membership?.status === "active") {
              action = { href: `/groups/${group.id}`, label: "Open room" };
            } else if (membership?.status === "pending") {
              action = { href: `/groups/${group.id}/votes`, label: "View member review", secondary: true };
            } else if (membership?.status === "waitlist") {
              action = { href: `/groups/${group.id}/apply`, label: "View application", secondary: true };
            } else if (slotsFull) {
              action = { href: "/", label: "4/4 slots used", secondary: true };
            } else {
              action = { href: `/groups/${group.id}/apply`, label: "Request access" };
            }

            return (
              <article key={group.id} className="rounded-[24px] border border-line bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl space-y-5">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{group.name}</h2>
                        <span className="text-sm text-muted">
                          {group.memberCount}/50 members / {difficultySignal}
                        </span>
                      </div>
                      <p className="text-sm leading-7 text-muted">
                        {group.description || "A private room built around high-context professional decisions."}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                      <span className="rounded-full bg-panel px-3 py-1 text-foreground">
                        {priceLabel(group.price)}
                      </span>
                      <span className="rounded-full bg-panel px-3 py-1">{roomFitSignal}</span>
                      <span className="rounded-full bg-panel px-3 py-1">{activitySignal}</span>
                    </div>

                    <p className="text-sm leading-7 text-foreground">
                      <span className="font-medium">Best for:</span> {oneLine(group.whoFor, 140)}
                    </p>

                    <div className="grid gap-4 border-y border-line py-4 md:grid-cols-[1fr_1.2fr]">
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-xs font-semibold text-white">
                            {initials(group.owner.name || group.owner.email)}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{peopleSignal}</p>
                            <p className="text-xs text-muted">{group.owner.name ? group.owner.email : "Room curator"}</p>
                          </div>
                        </div>
                        <div className="flex -space-x-2">
                          {[group.owner.name || group.owner.email, group.name, group.whoFor].map((value, index) => (
                            <div
                              key={`${group.id}-avatar-${index}`}
                              className="grid h-8 w-8 place-items-center rounded-full border-2 border-white bg-panel text-[10px] font-semibold text-muted"
                            >
                              {initials(value)}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Recent asks</p>
                        <div className="mt-2 space-y-1.5">
                          {asks.slice(0, 2).map((ask) => (
                            <p key={ask} className="text-sm text-foreground">
                              {ask}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <details className="border-b border-line pb-4">
                      <summary className="cursor-pointer text-sm font-medium text-foreground">Entry criteria</summary>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">For</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">{group.whoFor}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Not for</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">{group.whoNotFor}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">What members get</p>
                          <p className="mt-2 text-sm leading-6 text-foreground">{group.valueProp}</p>
                        </div>
                      </div>
                    </details>
                  </div>

                  <div className="w-full shrink-0 space-y-3 lg:w-56">
                    <Link
                      href={`/groups/${group.id}`}
                      className="inline-flex w-full items-center justify-center rounded-full bg-foreground px-4 py-3 text-sm font-medium text-white transition hover:opacity-90"
                    >
                      Preview room
                    </Link>
                    <Link
                      href={action.href}
                      className={`inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition ${
                        action.secondary
                          ? "border border-line bg-white text-muted hover:border-foreground hover:text-foreground"
                          : "border border-line bg-white text-foreground hover:border-foreground"
                      }`}
                    >
                      {action.label}
                    </Link>
                    {membership?.status === "waitlist" ? (
                      <p className="text-sm text-muted">You are already in the queue for this room.</p>
                    ) : null}
                    {membership?.status === "pending" ? (
                      <p className="text-sm text-muted">Your application is in active review now.</p>
                    ) : null}
                    {!membership && slotsFull ? (
                      <p className="text-sm text-muted">Leave one of your current rooms before requesting access here.</p>
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      </div>
    </main>
  );
}
