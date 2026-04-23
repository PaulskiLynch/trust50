"use client";

import Link from "next/link";
import { GroupStatus } from "@prisma/client";
import { signIn, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { ComparisonSection } from "@/components/ComparisonSection";
import { FinalCTA } from "@/components/FinalCTA";
import { GroupPreview } from "@/components/GroupPreview";
import { Hero } from "@/components/Hero";

type Membership = {
  id: string;
  status: string;
};

type Group = {
  id: string;
  name: string;
  description: string | null;
  status: GroupStatus;
  memberCount: number;
  memberships: Membership[];
  owner?: {
    name: string | null;
  } | null;
};

const problemBlocks = [
  {
    title: "Broadcasting doesn't work",
    body: "You post on LinkedIn. 500 people see it. 3 generic replies. No one who actually knows your context.",
  },
  {
    title: "One-on-one doesn't scale",
    body: "You DM 10 people individually. Half don't reply. The ones who do are doing you a favor, not building something sustainable.",
  },
  {
    title: "The right room doesn't exist",
    body: "You're in 12 Slack groups. 8 are dead. 3 are too broad. 1 is good, but the person running it just got busy and stopped responding.",
  },
];

const constraints = [
  {
    title: "50-member cap per room",
    body: "At 51+ people, you're not running a trusted room. You're managing a crowd. Crowds broadcast. Rooms make decisions.",
  },
  {
    title: "4-room limit per member",
    body: "Enough to move across the network for support. Not so many that you're spread thin and context turns into noise.",
  },
  {
    title: "Curator governance",
    body: "Curators don't own the room forever. They earn the right to run it. If quality slips, members can vote to replace them.",
  },
];

function getWaitlistCount(group: Group) {
  return group.memberships.filter((membership) =>
    ["waitlist", "pending", "invited"].includes(membership.status),
  ).length;
}

export default function LandingPage() {
  const { data: session, status } = useSession();
  const [groups, setGroups] = useState<Group[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setIsLoading(true);

      try {
        const response = await fetch("/api/groups");
        const data = (await response.json()) as Group[];

        if (!response.ok) {
          throw new Error("Unable to load groups");
        }

        setGroups(data);
      } catch (error) {
        setFlash(error instanceof Error ? error.message : "Unable to load groups");
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const publicGroups = useMemo(
    () => groups.filter((group) => group.status === GroupStatus.active || group.status === GroupStatus.emerging),
    [groups],
  );

  const featuredGroups = useMemo(() => {
    const prioritized = [
      "group-digital-pharma",
      "group-founders",
      "group-investments",
    ];

    return prioritized
      .map((id) => publicGroups.find((group) => group.id === id))
      .filter((group): group is Group => Boolean(group))
      .slice(0, 3);
  }, [publicGroups]);

  const previewGroups = useMemo(
    () =>
      featuredGroups.map((group) => {
        if (group.id === "group-digital-pharma") {
          return {
            id: group.id,
            name: "AI Builders (Public)",
            metrics: "Run by Kasia · Free · 50/50 members · 80 waiting",
            summary:
              "Kasia builds reputation in AI and product, then invites the strongest 15 into a paid premium room at €120/month.",
            curatorLine: "Free room as reputation engine, then best contributors graduate into a higher-trust paid room.",
          };
        }

        if (group.id === "group-founders") {
          return {
            id: group.id,
            name: "First-time Founders (Warsaw)",
            metrics: `Run by Tomasz · €10/month · ${group.memberCount}/50 members${getWaitlistCount(group) ? ` · ${getWaitlistCount(group)} waiting` : ""}`,
            summary:
              "Tomasz is testing pricing. If the waiting list grows, he'll either raise the price or launch a second room.",
            curatorLine: "Low-price room proving willingness to pay without losing the intimacy of a founder room.",
          };
        }

        return {
          id: group.id,
          name: "Series B+ Founders (EU)",
          metrics: "Run by Sara · €250/month · 12/50 members · €1,920/mo to curator",
          summary:
            "Sara keeps the room intentionally small and high-touch rather than filling to capacity. Members pay for access to 11 other Series B+ operators.",
          curatorLine: "High-price, low-volume room where selectivity is the product rather than a temporary state.",
        };
      }),
    [featuredGroups],
  );

  async function handleTestLogin() {
    setFlash(null);
    setIsLoggingIn(true);

    const result = await signIn("credentials", {
      email: "test@trust50.com",
      password: "Test123",
      redirect: false,
    });

    setIsLoggingIn(false);

    if (result?.error) {
      setFlash("Unable to sign in with test login");
      return;
    }

    setFlash("Signed in with test login");
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:py-14">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>Landing page reference</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/how-it-works" className="font-medium transition hover:text-foreground">
              How Trust50 works
            </Link>
            <Link href="/faq" className="font-medium transition hover:text-foreground">
              FAQ
            </Link>
            <Link href="/" className="font-medium transition hover:text-foreground">
              Back to network home
            </Link>
          </div>
        </div>

        <Hero
          onTestLogin={handleTestLogin}
          isLoggingIn={isLoggingIn || status === "loading"}
          isSignedIn={Boolean(session?.user)}
        />

        {flash ? (
          <div className="rounded-2xl border border-line bg-white px-5 py-3 text-sm text-muted shadow-sm">
            {flash}
          </div>
        ) : null}

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">The problem</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
            Trust50 is the country club model for the digital age, except members can replace leadership when the room
            stops serving them.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {problemBlocks.map((block) => (
              <div key={block.title} className="rounded-2xl border border-line bg-panel p-5">
                <p className="text-sm font-medium text-foreground">{block.title}</p>
                <p className="mt-3 text-sm leading-7 text-muted">{block.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Most rooms stay free, and that is by design</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-muted">
            80% of rooms are free. They build the network, seed discovery, and create conversion paths. The 20% that go
            paid fund the infrastructure for everyone.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">What Trust50 actually is</h2>
            <h3 className="mt-6 text-lg font-semibold text-foreground">For members: join up to 4 small, trusted rooms</h3>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted">
              <p>Choose carefully. You can only join 4 groups, so pick rooms where people actually know your context.</p>
              <p>Each room is capped at 50 members. You pay €0-300/month depending on the room, and you can leave anytime.</p>
              <p>
                You&apos;re never more than 4 hops from the person you need. The people in your rooms sit in other rooms too.
                Ask in one room, get connected to another.
              </p>
              <p>
                Four rooms means roughly 200 relationships across the network. That is enough reach to be powerful,
                but still small enough to remember who people are and why they matter.
              </p>
            </div>
          </div>

          <div className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">For curators: run a small group, get paid for it</h2>
            <div className="mt-3 space-y-3 text-sm leading-7 text-muted">
              <p>
                If you already answer questions, make intros, and help people make better decisions, structure it, charge
                for it, and keep 80%.
              </p>
              <p>Curate a room of 10-50 people, set your price, and run up to 4 rooms if that&apos;s your skill.</p>
              <p>
                Most rooms stay free. That&apos;s fine. Free rooms build your reputation and create paths to paid ones.
                The platform makes nothing from free rooms and is designed that way.
              </p>
            </div>
          </div>
        </section>

        <ComparisonSection />

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">The constraints are the product</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {constraints.map((constraint) => (
              <div key={constraint.title} className="rounded-2xl border border-line bg-panel p-5">
                <p className="text-sm font-medium text-foreground">{constraint.title}</p>
                <p className="mt-3 text-sm leading-7 text-muted">{constraint.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="group-preview">
          {!isLoading ? <GroupPreview groups={previewGroups} /> : null}
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Two paths in</h2>
            <h3 className="mt-6 text-lg font-semibold text-foreground">Join a room</h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              Browse groups, request access, get voted in by members. You can join up to 4 rooms total.
            </p>
            <Link
              href="/explore-groups"
              className="mt-5 inline-flex rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
            >
              Explore groups
            </Link>
          </div>

          <div className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Start a room</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              Anyone can create a group and invite people. You set the price, the rules, and who gets in. You keep 80%.
            </p>
            <Link
              href="/start-a-group"
              className="mt-5 inline-flex rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
            >
              Start a group
            </Link>
          </div>
        </section>

        <FinalCTA />
      </div>
    </main>
  );
}
