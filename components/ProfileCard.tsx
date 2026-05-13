"use client";

import Link from "next/link";

type ProfileUser = {
  id: string;
  name: string | null;
  decisionHistory: { title: string; impact: string; groupName?: string }[];
  trustCount: number;
  activeGroups: { id: string; name: string }[];
  pendingGroups?: { id: string; name: string; status?: string }[];
};

type ProfileCardProps = {
  user: ProfileUser;
  isOwnProfile?: boolean;
};

export function ProfileCard({ user, isOwnProfile = false }: ProfileCardProps) {
  const pendingGroups = isOwnProfile ? user.pendingGroups ?? [] : [];
  const queuedLabel = (status?: string) => {
    if (status === "pending") return "In review";
    if (status === "invited") return "Invited";
    return "In queue";
  };

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-sm">
      <div className="space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Active Circles</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {user.activeGroups.slice(0, 4).map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center gap-2 rounded-2xl border border-line bg-panel px-4 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                {group.name}
              </Link>
            ))}
            {pendingGroups.map((group) => (
              <Link
                key={group.id}
                href={`/groups/${group.id}`}
                className="flex items-center gap-2 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 transition hover:border-amber-400"
              >
                <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                <span className="min-w-0 truncate">{group.name}</span>
                <span className="ml-auto shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                  {queuedLabel(group.status)}
                </span>
              </Link>
            ))}
            {isOwnProfile && user.activeGroups.length + pendingGroups.length < 4 ? (
              <Link
                href="/explore-groups"
                className="flex items-center justify-center rounded-2xl border border-dashed border-line bg-white px-4 py-3 text-sm font-medium text-muted transition hover:border-foreground hover:text-foreground"
              >
                + Circle
              </Link>
            ) : null}
            {!user.activeGroups.length && !pendingGroups.length ? (
              <span className="rounded-2xl border border-dashed border-line bg-panel px-4 py-3 text-sm font-medium text-muted">
                No active circles yet
              </span>
            ) : null}
          </div>
          {isOwnProfile ? (
            <Link
              href="/explore-groups"
              className="mt-4 inline-flex rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-foreground"
            >
              Manage Circles
            </Link>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recently Trusted For</p>
          <div className="mt-4 space-y-3">
            {user.trustCount > 0 && user.decisionHistory.length ? (
              user.decisionHistory.map((decision) => (
                <div key={decision.title} className="border-l border-line pl-4">
                  <p className="text-sm font-medium text-foreground">{decision.title}</p>
                  <p className="mt-1 text-xs text-muted">{decision.impact}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-4 text-sm text-muted">
                No trust-backed decisions yet. Once members trust your judgment, your recent trusted decisions will show here.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
