"use client";

import Image from "next/image";

type ProfileUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  headline: string | null;
  linkedinUrl: string | null;
  groupsActiveIn: string[];
  trustLevel: "New" | "Contributor" | "Trusted";
  helpfulRepliesCount: number;
  knownFor: string[];
  verification: string[];
};

type ProfileCardProps = {
  user: ProfileUser;
};

export function ProfileCard({ user }: ProfileCardProps) {
  const knownFor = user.knownFor.length
    ? user.knownFor
    : ["Early-stage operator", "Warm introductions", "Practical judgment"];
  const activeRoomLabel = user.groupsActiveIn.length
    ? user.groupsActiveIn.join(" / ")
    : "Looking for the first room where they can add value";

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
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{user.name || "Current user"}</h2>
              <p className="mt-1 text-sm leading-6 text-muted">
                {user.headline || knownFor.slice(0, 2).join(" / ")}
              </p>
            </div>
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
              {user.trustLevel}
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {user.verification.map((signal) => (
              <span
                key={signal}
                className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted"
              >
                {signal}
              </span>
            ))}
          </div>
          <p className="mt-3 text-sm text-muted">
            {user.helpfulRepliesCount > 0
              ? `${user.helpfulRepliesCount} helpful ${user.helpfulRepliesCount === 1 ? "reply" : "replies"} recently`
              : "Building reputation through useful context"}
          </p>
          <p className="mt-1 text-xs text-muted/80">
            Trust is earned through replies, intros, vouches, and sponsorships that work out.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Active rooms</p>
          <div className="mt-2.5 rounded-2xl bg-panel px-4 py-3">
            <p className="text-sm text-foreground">{activeRoomLabel}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Known for</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {knownFor.map((tag) => (
              <span key={tag} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Recent contributions</p>
          <div className="mt-2.5 space-y-2 rounded-2xl bg-panel px-4 py-3 text-sm text-foreground">
            <p>{user.helpfulRepliesCount || 0} helpful replies</p>
            <p>{Math.max(0, user.verification.length - 1)} verified trust signals</p>
            <p>{user.groupsActiveIn[0] ? `Active in ${user.groupsActiveIn[0]}` : "Ready to contribute in a first room"}</p>
          </div>
        </div>

        {user.linkedinUrl ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Identity</p>
            <div className="mt-2.5 rounded-2xl bg-panel px-4 py-3">
              <a
                href={user.linkedinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-foreground transition hover:text-muted"
              >
                View LinkedIn profile
              </a>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
