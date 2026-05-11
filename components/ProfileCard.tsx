"use client";

import Image from "next/image";

type ProfileUser = {
  id: string;
  name: string | null;
  avatarUrl: string | null;
  decisionHistory: { title: string; impact: string; groupName?: string }[];
  helpTopics: string[];
  trustSignals: string[];
  trustCount: number;
};

type ProfileCardProps = {
  user: ProfileUser;
};

export function ProfileCard({ user }: ProfileCardProps) {
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{user.name || "Current user"}</h2>
            <span className="rounded-full bg-foreground px-3 py-1 text-xs font-medium text-white">
              Trusted by {user.trustCount} {user.trustCount === 1 ? "person" : "people"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">
            Here are decisions I have made that other members may be able to use.
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Decisions I&apos;ve Made</p>
          <div className="mt-4 space-y-4">
            {user.decisionHistory.map((decision) => (
              <div key={decision.title} className="border-l border-line pl-4">
                <p className="text-sm font-medium text-foreground">{decision.title}</p>
                <p className="mt-1 text-xs text-muted">{decision.impact}</p>
                {decision.groupName ? <p className="mt-1 text-xs text-muted/80">{decision.groupName}</p> : null}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">What I Can Help With</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {user.helpTopics.map((tag) => (
              <span key={tag} className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Who Trusts Me</p>
          <div className="mt-2.5 space-y-2 rounded-2xl bg-panel px-4 py-3 text-sm text-foreground">
            {user.trustSignals.map((signal) => (
              <p key={signal}>{signal}</p>
            ))}
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
