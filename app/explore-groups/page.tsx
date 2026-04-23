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

function priceLabel(price: number | null) {
  return price && price > 0 ? `€${price}/month` : "Free";
}

function statusLabel(status: string) {
  if (status === "active") return "Established";
  if (status === "emerging") return "Active";
  return "Draft";
}

function getMembership(group: Group, userId: string | null) {
  if (!userId) return null;
  return group.memberships.find((membership) => membership.userId === userId) ?? null;
}

export default function ExploreGroupsPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [flash, setFlash] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>Explore groups</p>
          <Link href="/landing" className="font-medium transition hover:text-foreground">
            Back to landing page
          </Link>
        </div>

        <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
          <div className="max-w-3xl space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Find the rooms worth one of your four slots</h1>
            <p className="text-sm leading-7 text-muted">
              Browse live Trust50 rooms, see how full they are, and request access where your context is strongest.
              You can join up to four rooms as a member. Rooms you run do not count toward that limit.
            </p>
          </div>
        </section>

        {currentUserId ? (
          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-foreground">
                  You&apos;re using {activeMemberSlotsUsed} of 4 room slots.
                </p>
                <p className="mt-1 text-sm text-muted">
                  To join a new room, leave an existing one. Rooms you run do not count toward your limit.
                </p>
              </div>
              <Link
                href="/"
                className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Back to cockpit
              </Link>
            </div>
          </section>
        ) : null}

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

          {!loading && !liveGroups.length ? (
            <div className="rounded-[28px] border border-line bg-white px-6 py-8 text-sm text-muted shadow-sm">
              No live rooms are visible yet.
            </div>
          ) : null}

          {liveGroups.map((group) => {
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
              <article key={group.id} className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                  <div className="max-w-3xl space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                      <span className="rounded-full border border-line px-3 py-1">{statusLabel(group.status)}</span>
                      <span className="rounded-full border border-line px-3 py-1">{priceLabel(group.price)}</span>
                      <span className="rounded-full border border-line px-3 py-1">
                        {group.memberCount}/50 members
                      </span>
                      {waitlistCount ? (
                        <span className="rounded-full border border-line px-3 py-1">{waitlistCount} waiting</span>
                      ) : null}
                      {pendingCount ? (
                        <span className="rounded-full border border-line px-3 py-1">{pendingCount} in review</span>
                      ) : null}
                      {outcomesThisMonth ? (
                        <span className="rounded-full border border-line px-3 py-1">{outcomesThisMonth} outcomes this month</span>
                      ) : null}
                      {activeThreadCount >= 3 ? (
                        <span className="rounded-full border border-line px-3 py-1">High engagement</span>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{group.name}</h2>
                      <p className="text-sm leading-7 text-muted">
                        {group.description || "A private room built around high-context professional decisions."}
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">For</p>
                        <p className="mt-2 text-sm text-foreground">{group.whoFor}</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">Not for</p>
                        <p className="mt-2 text-sm text-foreground">{group.whoNotFor}</p>
                      </div>
                      <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">What members get</p>
                        <p className="mt-2 text-sm text-foreground">{group.valueProp}</p>
                      </div>
                    </div>

                    <p className="text-sm text-muted">
                      Run by <span className="font-medium text-foreground">{group.owner.name || group.owner.email}</span>
                    </p>
                  </div>

                  <div className="w-full shrink-0 space-y-3 lg:w-56">
                    <Link
                      href={action.href}
                      className={`inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-medium transition ${
                        action.secondary
                          ? "border border-line bg-white text-foreground hover:border-foreground"
                          : "bg-foreground text-white hover:opacity-90"
                      }`}
                    >
                      {action.label}
                    </Link>
                    <Link
                      href={`/groups/${group.id}`}
                      className="inline-flex w-full items-center justify-center rounded-full border border-line bg-white px-4 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
                    >
                      Preview
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
