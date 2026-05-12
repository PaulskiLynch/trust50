"use client";

import Link from "next/link";

type ProfileUser = {
  id: string;
  name: string | null;
  decisionHistory: { title: string; impact: string; groupName?: string }[];
  trustCount: number;
  activeGroups: { id: string; name: string }[];
};

type ProfileCardProps = {
  user: ProfileUser;
  isOwnProfile?: boolean;
};

function trustStatus(score: number) {
  if (score >= 151) return "Exceptional";
  if (score >= 101) return "Deeply trusted";
  if (score >= 51) return "Respected";
  if (score >= 21) return "Trusted";
  return "Building trust";
}

function paddedTrustScore(score: number) {
  return String(Math.min(score, 200)).padStart(2, "0");
}

export function ProfileCard({ user, isOwnProfile = false }: ProfileCardProps) {
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
                className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                {group.name}
              </Link>
            ))}
            {!user.activeGroups.length ? (
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
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trust Level</p>
          <div className="mt-3 space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-panel">
              <div
                className="h-full rounded-full bg-foreground transition-[width]"
                style={{ width: `${Math.max(4, (Math.min(user.trustCount, 200) / 200) * 100)}%` }}
              />
            </div>
            <p className="text-sm font-medium text-foreground">
              {paddedTrustScore(user.trustCount)} / 200 <span className="text-muted">/</span> {trustStatus(user.trustCount)}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recently Trusted For</p>
          <div className="mt-4 space-y-3">
            {user.decisionHistory.map((decision) => (
              <div key={decision.title} className="border-l border-line pl-4">
                <p className="text-sm font-medium text-foreground">{decision.title}</p>
                <p className="mt-1 text-xs text-muted">{decision.impact}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
