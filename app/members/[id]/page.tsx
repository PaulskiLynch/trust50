import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProfileCard } from "@/components/ProfileCard";
import { ProfileBuilder } from "@/components/ProfileBuilder";
import { getAuthSession } from "@/lib/auth";
import { getAccessibleProfile } from "@/lib/profiles";

function WireIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5A3.5 3.5 0 0 1 15.5 15H11l-5 4v-4.3A3.5 3.5 0 0 1 5 12V6.5Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 11h4" strokeLinecap="round" />
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
      <div className="flex items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trust50-logo.png" alt="Trust50" className="h-11 w-11 rounded-xl object-contain" />
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
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.62fr]">
          <section className="space-y-6">
            <div className="space-y-2">
              <div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                  {profile.name || "Your profile"}
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Your profile is a feed of judgment, not a resume.
                </p>
              </div>
            </div>

            <ProfileCard
              user={{
                id: profile.id,
                name: profile.name,
                avatarUrl: profile.avatarUrl,
                decisionHistory: profile.decisionHistory,
                helpTopics: profile.helpTopics,
                trustSignals: profile.trustSignals,
              }}
            />
          </section>

          <aside className="space-y-4">
            <ProfileBuilder profile={profile} />
            <section className="rounded-[24px] border border-line bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-foreground">Room slots</p>
              <p className="mt-1 text-sm text-muted">{profile.activeGroups.length}/4 member rooms used</p>
              <Link
                href="/explore-groups"
                className="mt-3 inline-flex rounded-full border border-line bg-panel px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Manage rooms
              </Link>
            </section>
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.42fr]">
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
                Decisions this member has made that might help you.
              </p>
            </div>
          </div>

          <ProfileCard
            user={{
              id: profile.id,
              name: profile.name,
              avatarUrl: profile.avatarUrl,
              decisionHistory: profile.decisionHistory,
              helpTopics: profile.helpTopics,
              trustSignals: profile.trustSignals,
            }}
          />
        </section>

        <aside>
          <section className="rounded-[24px] border border-line bg-white p-4 shadow-sm">
            <p className="text-sm font-semibold text-foreground">Shared context</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {profile.sharedGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/groups/${group.id}`}
                  className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-foreground"
                >
                  {group.name}
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
