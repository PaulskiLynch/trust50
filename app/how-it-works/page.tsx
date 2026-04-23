import Link from "next/link";

const memberPoints = [
  "Each room is capped at 50 members.",
  "You pay €0-300/month depending on the room.",
  "You can leave anytime.",
];

const curatorPoints = [
  "You keep 80%. The platform keeps 20%.",
  "You can run free rooms or paid rooms, or both.",
  "You earn the right to run the room, but don't own it forever.",
];

const roomMath = [
  "10 members at €50/month = €400 gross -> €320 to curator",
  "25 members at €50/month = €1,000 gross -> €800 to curator",
  "50 members at €50/month = €2,000 gross -> €1,600 to curator",
];

const strategies = [
  {
    title: "Free room (reputation building)",
    body: "€0/month · 30-50 members. Build reputation, create a conversion funnel, or simply help without monetizing.",
  },
  {
    title: "Low-price, high-volume",
    body: "€30-50/month · 40-50 members. €1.2K-2K/month per room.",
  },
  {
    title: "High-price, medium-volume",
    body: "€100-150/month · 25-40 members. €2.4K-4.8K/month per room.",
  },
  {
    title: "Premium, low-volume",
    body: "€200-300/month · 10-15 members. €1.6K-3.6K/month per room.",
  },
];

const platformReasons = [
  "Escrow: The platform holds continuity during curator transitions so the room doesn't collapse when leadership changes.",
  "Integrity: Voting, revenue splits, and governance are handled by a neutral third party.",
  "Infrastructure: Payment rails, waiting lists, quality signals, governance rules, and room continuity all live in one operating system.",
  "Subsidy: Free rooms pay nothing. Paid rooms fund the infrastructure that makes free rooms possible.",
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:py-14">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="font-medium transition hover:text-foreground">
              Back to network home
            </Link>
            <span>/</span>
            <Link href="/landing" className="font-medium transition hover:text-foreground">
              Back to landing page
            </Link>
          </div>
          <span>Investor / partner explainer</span>
        </div>

        <section className="rounded-[32px] border border-line bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">How Trust50 Works</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            The platform for monetizing trusted rooms without letting them turn into crowds.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            You already answer questions, make introductions, and help people make better decisions. Trust50 lets you
            structure that work, monetize it, and keep 80% without turning your trusted room into a crowd.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
            It is the country club model for the digital age, except members can replace leadership when the room stops
            serving them.
          </p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">The core model</h2>
            <h3 className="mt-6 text-lg font-semibold text-foreground">For members</h3>
            <p className="mt-3 text-sm leading-7 text-muted">
              You can join up to 4 rooms, enough to move across the network for support, but not so many that context
              turns into noise.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted">
              {memberPoints.map((point) => (
                <p key={point}>{point}</p>
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              The people in your 4 rooms sit in other rooms too. Within two or three warm introductions, you can usually
              reach the exact person you need. You&apos;re never more than 4 hops from the perfect connection.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted">
              In practice that means roughly 200 trusted relationships across the network, close to the upper limit of
              human social bandwidth before context starts turning into noise.
            </p>
          </div>

          <div className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
            <h2 className="text-2xl font-semibold tracking-tight">For curators</h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              You can run up to 4 rooms. You decide who gets in, what they pay, how the room is structured, and what
              the room is for.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted">
              Fill two paid rooms at 30 members each, charge €50/month, and you&apos;re making €2,400/month (€28K/year).
              That&apos;s the math.
            </p>
            <div className="mt-4 space-y-2 text-sm text-muted">
              {curatorPoints.map((point) => (
                <p key={point}>{point}</p>
              ))}
            </div>
            <p className="mt-4 text-sm leading-7 text-muted">
              Most rooms start free and many stay that way. Free rooms are not a concession. They are part of the model.
              You use them to build reputation, prove the room works, create funnels into paid rooms, or simply help
              people without monetizing.
            </p>
            <p className="mt-4 text-sm leading-7 text-muted">
              Roughly 80% of rooms stay free. The 20% that go paid fund the infrastructure for the entire system.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Why the constraints matter</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            These aren&apos;t limitations. They&apos;re the features that keep quality legible and waiting lists real.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm font-medium text-foreground">50-member cap per room</p>
              <p className="mt-3 text-sm leading-7 text-muted">
                At 51+ people, the curator is not running a trusted room anymore. They&apos;re managing a crowd.
                Crowds broadcast. Rooms make decisions.
              </p>
              <p className="mt-3 text-sm text-muted">
                Quality stays legible. Waiting lists become signal. The cap protects the curator from accidental overgrowth.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm font-medium text-foreground">4-room limit per member</p>
              <p className="mt-3 text-sm leading-7 text-muted">
                At 4 rooms, you have roughly 200 direct connections across the network. That&apos;s powerful but still
                small enough to remember context and relationships.
              </p>
              <p className="mt-3 text-sm text-muted">
                Intentional choice. Higher contribution. Stronger signal for curators.
              </p>
            </div>
            <div className="rounded-2xl border border-line bg-panel p-5">
              <p className="text-sm font-medium text-foreground">Curator governance</p>
              <p className="mt-3 text-sm leading-7 text-muted">
                Curators don&apos;t own the room forever. They earn the right to run it. If they stop curating, let
                quality slip, or start extracting without serving, the room can replace them.
              </p>
              <p className="mt-3 text-sm text-muted">
                This is what lets the room survive burnout, greed, drift, or abandonment.
              </p>
            </div>
          </div>
          <p className="mt-5 text-sm text-muted">Rooms you curate don&apos;t count toward your 4-room member limit.</p>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">How the economics work</h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Most paid rooms push toward 50 members because that&apos;s where income becomes meaningful, but the right
            strategy depends on how hands-on the curator wants to be.
          </p>
          <div className="mt-5 rounded-2xl border border-line bg-panel p-5">
            <h3 className="text-lg font-semibold">Simple room math</h3>
            <div className="mt-3 space-y-2 text-sm text-muted">
              {roomMath.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {strategies.map((strategy) => (
              <div key={strategy.title} className="rounded-2xl border border-line bg-panel p-5">
                <p className="text-sm font-medium text-foreground">{strategy.title}</p>
                <p className="mt-3 text-sm leading-7 text-muted">{strategy.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">The free-to-paid path</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>Most successful paid rooms started free.</p>
            <p>Months 1-3: Launch free {"->"} Invite 20 people {"->"} Prove value {"->"} Build waiting list</p>
            <p>Months 4-6: Decision point {"->"} Convert to paid / Launch paid tier / Stay free</p>
            <p>12 months: ~20% of free rooms convert to paid, and that&apos;s success.</p>
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">What the platform handles (so you don&apos;t have to)</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            {platformReasons.map((reason) => (
              <p key={reason}>{reason}</p>
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">The honest bottom line</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>
              Trust50 is not selling community software. It&apos;s selling a way for credible people to turn trusted rooms
              into accountable, recurring income without destroying the thing that makes the room valuable.
            </p>
            <p>80% of rooms stay free. That&apos;s the design.</p>
            <p>The 50-person cap per room is the feature, not a limitation.</p>
            <p>The 4-room limit per member forces intentional choices.</p>
            <p>The governance model is why the room can survive and compound.</p>
            <p className="font-medium text-foreground">
              If a curator can fill and maintain two or three rooms, Trust50 can replace a salary. If they stop serving
              the room, the room replaces them.
            </p>
            <p className="font-medium text-foreground">
              And for members: you&apos;re never more than 4 hops from the connection you actually need, whether that
              connection comes through a free room or a paid one.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
