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
  return (
    <section className="rounded-3xl border border-line bg-panel p-6 shadow-sm">
      <div className="flex items-start gap-4">
        <Image
          src={user.avatarUrl || "https://i.pravatar.cc/240?img=1"}
          alt={user.name || "User avatar"}
          width={64}
          height={64}
          className="h-16 w-16 rounded-2xl object-cover"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{user.name || "Current user"}</h2>
          <p className="mt-1 text-sm text-muted">{user.headline || "Trusted Trust50 member"}</p>
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
              : "Building credibility through helpful replies"}
          </p>
          <p className="mt-1 text-xs text-muted/80">Known and trusted within this network</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Context</p>
          <div className="mt-2.5 rounded-2xl border border-line bg-white px-4 py-3">
            <p className="text-sm text-foreground">
              {user.groupsActiveIn.length
                ? user.groupsActiveIn.join(" · ")
                : "No active groups yet"}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Known for</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {user.knownFor.length ? (
              user.knownFor.map((tag) => (
                <span key={tag} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
                  {tag}
                </span>
              ))
            ) : (
              <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
                Getting established
              </span>
            )}
          </div>
        </div>

        {user.linkedinUrl ? (
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Identity</p>
            <div className="mt-2.5 rounded-2xl border border-line bg-white px-4 py-3">
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
