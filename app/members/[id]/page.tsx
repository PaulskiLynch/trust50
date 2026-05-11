import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProfileCard } from "@/components/ProfileCard";
import { ProfileBuilder } from "@/components/ProfileBuilder";
import { getAuthSession } from "@/lib/auth";
import { getAccessibleProfile } from "@/lib/profiles";

function WireIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M4 6.5h16M4 12h10M4 17.5h7" strokeLinecap="round" />
      <path d="M17 13.5 20 16l-3 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RoomsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" strokeLinejoin="round" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" strokeLinecap="round" />
      <path d="M14 8l4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MemberTopNav({ currentUserId }: { currentUserId: string }) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trust50-logo.png" alt="Trust50" className="h-9 w-9 rounded-xl object-contain" />
        <div>
          <p className="text-sm font-semibold text-foreground">Trust50</p>
          <h1 className="mt-0.5 text-sm font-medium text-muted">Me</h1>
        </div>
      </div>
      <div className="flex items-end gap-1 sm:gap-3">
        <Link
          href="/"
          className="flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
        >
          <WireIcon />
          <span>Wire</span>
        </Link>
        <Link
          href="/explore-groups"
          className="flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
        >
          <RoomsIcon />
          <span>Rooms</span>
        </Link>
        <Link
          href={`/members/${currentUserId}`}
          className="flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-foreground transition hover:bg-panel"
          aria-current="page"
        >
          <MeIcon />
          <span>Me</span>
        </Link>
        <Link
          href="/api/auth/signout"
          className="flex min-w-12 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs font-medium text-muted transition hover:bg-panel hover:text-foreground"
        >
          <SignOutIcon />
          <span>Out</span>
        </Link>
      </div>
    </header>
  );
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function MemberProfilePage({ params }: PageProps) {
  const session = await getAuthSession();
  const viewerId = session?.user?.id;

  if (!viewerId) {
    redirect("/");
  }

  const { id } = await params;
  const profile = await getAccessibleProfile(viewerId, id);

  if (!profile) {
    notFound();
  }

  const isOwnProfile = viewerId === id;

  if (isOwnProfile) {
    return (
      <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
        <div className="mx-auto max-w-5xl">
          <MemberTopNav currentUserId={viewerId} />
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.78fr]">
          <section className="space-y-6">
            <div className="space-y-2">
              <div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  Your Trust50 profile
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Manage the context other members use to understand where you can help.
                </p>
              </div>
            </div>

            <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Your rooms</h2>
              <p className="mt-1 text-sm text-muted">
                Rooms where you can contribute, ask for judgment, and build reputation.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.activeGroups.length ? (
                  profile.activeGroups.map((group) => (
                    <Link
                      key={group.id}
                      href={`/groups/${group.id}`}
                      className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-foreground"
                    >
                      {group.name}
                    </Link>
                  ))
                ) : (
                  <Link
                    href="/explore-groups"
                    className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Find your first room
                  </Link>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Reputation</h2>
              <p className="mt-2 text-sm leading-6 text-muted">
                Built through thoughtful replies, successful introductions, accurate judgment, and sponsorships that worked out.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-panel px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {profile.credibility.helpfulRepliesCount} helpful {profile.credibility.helpfulRepliesCount === 1 ? "reply" : "replies"}
                  </p>
                  <p className="mt-1 text-xs text-muted">Recent answers other members could use.</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{profile.credibility.trustLevel} trust level</p>
                  <p className="mt-1 text-xs text-muted">Earned from visible participation.</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {profile.activeGroups[0] ? `Active in ${profile.activeGroups[0].name}` : "Ready for a first room"}
                  </p>
                  <p className="mt-1 text-xs text-muted">Where your context is visible.</p>
                </div>
                <div className="rounded-2xl bg-panel px-4 py-3">
                  <p className="text-sm font-medium text-foreground">
                    {(profile.credibility.knownFor[0] || profile.stageIndustry || profile.role || "Practical judgment").replace("Getting established", "Practical judgment")}
                  </p>
                  <p className="mt-1 text-xs text-muted">What members are starting to associate with you.</p>
                </div>
              </div>
            </section>
          </section>

          <aside className="space-y-4">
            <ProfileBuilder profile={profile} />
            <ProfileCard
              user={{
                id: profile.id,
                name: profile.name,
                avatarUrl: profile.avatarUrl,
                headline: profile.headline,
                linkedinUrl: profile.linkedinUrl,
                groupsActiveIn: profile.activeGroups.map((group) => group.name),
                trustLevel: profile.credibility.trustLevel,
                helpfulRepliesCount: profile.credibility.helpfulRepliesCount,
                knownFor: profile.credibility.knownFor,
                verification: profile.credibility.verification,
              }}
            />
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.78fr]">
        <section className="space-y-6">
          <div className="space-y-2">
            <Link href="/" className="text-sm font-medium text-muted transition hover:text-foreground">
              Back to network home
            </Link>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {profile.name || profile.email}
              </h1>
              <p className="mt-1 text-sm text-muted">
                Visible because you share group context.
              </p>
            </div>
          </div>

          <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold">Shared context</h2>
            <p className="mt-1 text-sm text-muted">
              Groups you both have in common.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {profile.sharedGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  {group.name}
                </Link>
              ))}
            </div>
          </section>

          {profile.activeGroups.length > profile.sharedGroups.length ? (
            <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Also active in</h2>
              <p className="mt-1 text-sm text-muted">
                Other rooms that shape how this person thinks and contributes.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.activeGroups
                  .filter((group) => !profile.sharedGroups.some((sharedGroup) => sharedGroup.id === group.id))
                  .map((group) => (
                    <span
                      key={group.id}
                      className="rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-foreground"
                    >
                      {group.name}
                    </span>
                  ))}
              </div>
            </section>
          ) : null}
        </section>

        <aside>
          <ProfileCard
            user={{
              id: profile.id,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              headline: profile.headline,
              linkedinUrl: profile.linkedinUrl,
              groupsActiveIn: profile.activeGroups.map((group) => group.name),
              trustLevel: profile.credibility.trustLevel,
              helpfulRepliesCount: profile.credibility.helpfulRepliesCount,
              knownFor: profile.credibility.knownFor,
              verification: profile.credibility.verification,
            }}
          />
        </aside>
      </div>
    </main>
  );
}
