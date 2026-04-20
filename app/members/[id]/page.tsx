import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ProfileCard } from "@/components/ProfileCard";
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
