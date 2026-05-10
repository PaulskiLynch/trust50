import Link from "next/link";

const valueCards = [
  {
    icon: "table",
    title: "Private rooms",
    body: "Each room is capped at 50 people so the conversation stays useful, specific, and accountable.",
  },
  {
    icon: "signal",
    title: "Trusted peer advice",
    body: "Ask the people who have seen your problem before, not a public feed optimized for attention.",
  },
  {
    icon: "path",
    title: "Warm paths",
    body: "Your rooms connect you to other rooms through members who can make the right introduction.",
  },
];

const constraintCards = [
  {
    icon: "cap",
    title: "50-member cap",
    body: "Small enough for reputation to matter. Large enough to create range, pattern recognition, and useful disagreement.",
  },
  {
    icon: "rooms",
    title: "4 rooms per member",
    body: "You choose the rooms where you can contribute real context. That keeps the network intentional instead of noisy.",
  },
  {
    icon: "vouch",
    title: "Vouching controls access",
    body: "New members move through sponsor and voucher signals, so access is earned through trust rather than bought cold.",
  },
  {
    icon: "ledger",
    title: "Outcomes compound",
    body: "Rooms remember the intros, hires, decisions, and avoided mistakes they helped create.",
  },
];

const flowCards = [
  {
    icon: "ask",
    title: "Bring a real decision",
    body: "Post the hiring call, market question, operator tradeoff, or intro need where your room has context.",
  },
  {
    icon: "reply",
    title: "Get useful judgment",
    body: "Members comment with direct experience, sharp questions, and names they can credibly put behind the answer.",
  },
  {
    icon: "intro",
    title: "Move through warm paths",
    body: "When public context is not enough, the next step becomes a private introduction or direct conversation.",
  },
  {
    icon: "proof",
    title: "Capture what changed",
    body: "Good rooms become more valuable because their outcomes are visible to members and prospective members.",
  },
];

const platformCards = [
  {
    icon: "payments",
    title: "Payments and room access",
    body: "Free and paid rooms can coexist. Paid rooms fund the infrastructure without making the whole network a paywall.",
  },
  {
    icon: "queue",
    title: "Waiting lists and intake",
    body: "Applicants, sponsors, and vouchers live in one flow so rooms can grow without becoming open directories.",
  },
  {
    icon: "governance",
    title: "Continuity and governance",
    body: "The room can survive curator transitions because rules, membership, and history are held by the platform.",
  },
];

function ExplainerIcon({ type }: { type: string }) {
  const common = "h-5 w-5 fill-none stroke-current stroke-[1.8]";

  switch (type) {
    case "table":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M7 10h10M5 14h14M8 14v6M16 14v6M12 4a6 6 0 0 1 6 6H6a6 6 0 0 1 6-6Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "signal":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 18h2M9 18h2M14 18h6M6 18V9M11 18V6M18 18v-4" strokeLinecap="round" />
        </svg>
      );
    case "path":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M5 6a2 2 0 1 0 0 .1M19 18a2 2 0 1 0 0 .1M7 6h4a3 3 0 0 1 3 3v6a3 3 0 0 0 3 3h2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "cap":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 9h16M7 9v10h10V9M9 5h6l2 4H7l2-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "rooms":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 5h7v7H4V5ZM13 5h7v7h-7V5ZM4 14h7v5H4v-5ZM13 14h7v5h-7v-5Z" strokeLinejoin="round" />
        </svg>
      );
    case "vouch":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="m6 12 4 4 8-8M12 3l7 4v5c0 4-2.7 7.5-7 9-4.3-1.5-7-5-7-9V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "ledger":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M7 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM9 8h6M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "ask":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M12 18h.01M9.5 9a2.7 2.7 0 1 1 4.4 2.1c-1.2.8-1.9 1.4-1.9 2.9M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "reply":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M6 17.5 4 21v-4.8A7.5 7.5 0 0 1 5.5 4h13A3.5 3.5 0 0 1 22 7.5v5A3.5 3.5 0 0 1 18.5 16h-8.7c-1.4 0-2.7.5-3.8 1.5Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "intro":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM16 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM10.5 9.5l3 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "proof":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M5 13l4 4L19 7M5 21h14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 7h16v10H4V7ZM4 10h16M8 15h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "queue":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M7 6h14M7 12h14M7 18h14M3 6h.01M3 12h.01M3 18h.01" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M12 3v18M5 10l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function ExplainerCard({ card }: { card: { icon: string; title: string; body: string } }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-foreground">
        <ExplainerIcon type={card.icon} />
      </div>
      <p className="mt-4 text-sm font-medium text-foreground">{card.title}</p>
      <p className="mt-3 text-sm leading-7 text-muted">{card.body}</p>
    </div>
  );
}

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
          <span>How Trust50 Works</span>
        </div>

        <section className="rounded-[32px] border border-line bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">How Trust50 Works</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Exclusive rooms for trusted advice from peers who can actually help.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            Trust50 gives you small private groups where experienced operators, founders, investors, and specialists trade judgment, warm intros, and practical context around real decisions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90">
              Create account
            </Link>
            <Link href="/explore-groups" className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground">
              Browse rooms
            </Link>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {valueCards.map((card) => (
            <ExplainerCard key={card.title} card={card} />
          ))}
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Why the constraints matter</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            The limits are what make the rooms work. They keep attention scarce, reputation visible, and access meaningful.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {constraintCards.map((card) => (
              <ExplainerCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">What happens in a room</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Rooms are built around judgment, not content volume. The useful path is simple.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {flowCards.map((card) => (
              <ExplainerCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Free rooms and paid rooms</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Most rooms can stay free. Paid rooms exist when members want a higher-signal table with tighter curation, faster responses, or a specialist curator.
          </p>
          <div className="mt-5 rounded-2xl border border-line bg-panel p-5">
            <p className="text-sm font-medium text-foreground">The principle</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              Price is not the main gate. Reputation, context, and member trust are. Patron support and scholarship seats can keep strong members in the network even when a paid room would otherwise be out of reach.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">What the platform handles</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Trust50 provides the operating system around the room so members and curators can focus on useful signal.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {platformCards.map((card) => (
              <ExplainerCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">The bottom line</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>LinkedIn is a directory with a feed. Trust50 is a decision network with warm paths.</p>
            <p>Join rooms where your questions get better answers because the people answering have context, reputation, and a reason to care.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
