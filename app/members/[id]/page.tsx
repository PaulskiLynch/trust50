import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AppTopNav } from "@/components/AppTopNav";
import { ProfileCard } from "@/components/ProfileCard";
import { ProfileBuilder } from "@/components/ProfileBuilder";
import { ProfileIdentityCard } from "@/components/ProfileIdentityCard";
import { getAuthSession } from "@/lib/auth";
import { getAccessibleProfile } from "@/lib/profiles";

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
          <AppTopNav activeTab="me" currentUserId={viewerId} />
        </div>
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.62fr]">
          <section className="space-y-6">
            <ProfileIdentityCard
              profile={{
                name: profile.name,
                bio: profile.bio,
                avatarUrl: profile.avatarUrl,
                trustCount: profile.trustScoreCached,
              }}
            />
            <ProfileCard
              isOwnProfile
              user={{
                id: profile.id,
                name: profile.name,
                decisionHistory: profile.decisionHistory,
                trustCount: profile.trustScoreCached,
                activeGroups: profile.activeGroups,
                pendingGroups: profile.pendingGroups,
              }}
            />
          </section>

          <aside>
            <ProfileBuilder profile={profile} />
          </aside>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[1fr_0.42fr]">
        <section className="space-y-6">
          <AppTopNav currentUserId={viewerId} />
          <div className="space-y-2">
            <Link href="/" className="text-sm font-medium text-muted transition hover:text-foreground">
              Back to network home
            </Link>
          </div>

          <ProfileCard
            isOwnProfile={false}
            user={{
              id: profile.id,
              name: profile.name,
              decisionHistory: profile.decisionHistory,
              trustCount: profile.trustScoreCached,
              activeGroups: profile.activeGroups,
              pendingGroups: profile.pendingGroups,
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
