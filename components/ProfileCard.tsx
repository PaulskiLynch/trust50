"use client";

import Image from "next/image";

type ProfileUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  decisionHistory: { title: string; impact: string; groupName?: string }[];
  helpTopics: string[];
  hasUserHelpTopics: boolean;
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
      <div className="flex items-start gap-4">
        <Image
          src={user.avatarUrl || "/profile-placeholder.svg"}
          alt={user.name || "User avatar"}
          width={64}
          height={64}
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-semibold tracking-tight">{user.name || "Current user"}</h1>
          <p className="mt-1 text-sm leading-6 text-muted">
            {isOwnProfile ? "Your profile is a feed of judgment, not a resume." : "This profile is a feed of judgment, not a resume."}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Active Circles</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.activeGroups.slice(0, 3).map((group) => (
              <span key={group.id} className="inline-flex items-center gap-2 rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-foreground">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                {group.name}
              </span>
            ))}
            {user.activeGroups.length > 3 ? (
              <span className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted">
                +{user.activeGroups.length - 3} more
              </span>
            ) : null}
            {!user.activeGroups.length ? (
              <span className="rounded-full border border-dashed border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted">
                No active circles yet
              </span>
            ) : null}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trust Level</p>
          <p className="mt-2 text-sm font-medium text-foreground">
            {paddedTrustScore(user.trustCount)} / 200 <span className="text-muted">/</span> {trustStatus(user.trustCount)}
          </p>
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

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">What I Can Help With</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {user.hasUserHelpTopics ? (
              user.helpTopics.slice(0, 6).map((tag) => (
                <span key={tag} className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-foreground">
                  <span className="mr-1.5 text-muted">[x]</span>
                  {tag}
                </span>
              ))
            ) : (
              <a href="#build-profile" className="rounded-full border border-dashed border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted transition hover:border-foreground hover:text-foreground">
                Please choose your topics in About me
              </a>
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Ask Me About</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            These are decisions I have actually made. Start there.
          </p>
        </div>
      </div>
    </section>
  );
}
