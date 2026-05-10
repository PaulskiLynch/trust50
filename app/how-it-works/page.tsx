import Link from "next/link";

const membershipSteps = [
  {
    icon: "browse",
    title: "Find a room",
    body: "Browse rooms by topic and look for the places where your experience can help the conversation.",
  },
  {
    icon: "apply",
    title: "Apply with context",
    body: "Share who you are, why the room fits, and what useful perspective you can bring.",
  },
  {
    icon: "vouch",
    title: "Move through vouching",
    body: "A sponsor can move you into review. Members then voucher for fit before you are admitted.",
  },
  {
    icon: "enter",
    title: "Enter the room",
    body: "Once admitted, the room appears in your feed and you can comment, ask, support, and make warm introductions.",
  },
];

const practicalCards = [
  {
    icon: "rooms",
    title: "How many rooms can I join?",
    body: "You can join up to 4 rooms as a member. That keeps your network intentional and gives each room enough attention to matter.",
  },
  {
    icon: "cap",
    title: "Why 50 people per room?",
    body: "Rooms are capped at 50 members so people can remember context, reputations stay visible, and conversations stay specific.",
  },
  {
    icon: "payments",
    title: "What does free vs paid mean?",
    body: "Free rooms cost EUR 0. Paid rooms charge for tighter curation, higher signal, or specialist access. Price never replaces fit.",
  },
  {
    icon: "scholarship",
    title: "What if I qualify but cannot pay?",
    body: "Some paid rooms can include scholarship seats. The room stays paid, but strong members are not excluded only by price.",
  },
];

const insideRoomCards = [
  {
    icon: "feed",
    title: "Your feed",
    body: "You see questions and decisions from your rooms, with quick actions to support, comment, pass, or save for later.",
  },
  {
    icon: "comment",
    title: "Room discussion",
    body: "Threads are built around practical judgment: what you saw, what you would do, and who you can credibly point toward.",
  },
  {
    icon: "intro",
    title: "Warm introductions",
    body: "When a public answer is not enough, the next step can become a private intro or direct conversation.",
  },
  {
    icon: "ledger",
    title: "The Ledger",
    body: "Resolved threads can capture what changed, such as intros made, hires completed, or decisions clarified.",
  },
];

const governanceCards = [
  {
    icon: "curator",
    title: "What curators do",
    body: "Curators shape the room, manage quality, admit members, and keep the conversation useful.",
  },
  {
    icon: "replace",
    title: "If a curator stops serving",
    body: "The room is not dependent on one person forever. Governance and continuity live on the platform.",
  },
  {
    icon: "patron",
    title: "How free rooms stay alive",
    body: "Members can become patrons of free rooms. Patrons get recognition, not special access.",
  },
];

function ExplainerIcon({ type }: { type: string }) {
  const common = "h-5 w-5 fill-none stroke-current stroke-[1.8]";

  switch (type) {
    case "browse":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M10.5 18a7.5 7.5 0 1 1 5.3-2.2L21 21" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 10h5M8 13h3" strokeLinecap="round" />
        </svg>
      );
    case "apply":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M7 4h10a2 2 0 0 1 2 2v14H5V6a2 2 0 0 1 2-2Z" strokeLinejoin="round" />
          <path d="M8 9h8M8 13h8M8 17h5" strokeLinecap="round" />
        </svg>
      );
    case "vouch":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="m6 12 4 4 8-8M12 3l7 4v5c0 4-2.7 7.5-7 9-4.3-1.5-7-5-7-9V7l7-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "enter":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 12h12M12 8l4 4-4 4M20 4v16" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "rooms":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 5h7v7H4V5ZM13 5h7v7h-7V5ZM4 14h7v5H4v-5ZM13 14h7v5h-7v-5Z" strokeLinejoin="round" />
        </svg>
      );
    case "cap":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 9h16M7 9v10h10V9M9 5h6l2 4H7l2-4Z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "payments":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M4 7h16v10H4V7ZM4 10h16M8 15h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "scholarship":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M12 3 4 7l8 4 8-4-8-4ZM6 10v5c0 2 2.7 4 6 4s6-2 6-4v-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "feed":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M6 5h12M6 10h12M6 15h8M6 20h5" strokeLinecap="round" />
        </svg>
      );
    case "comment":
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
    case "ledger":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M7 4h10a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM9 8h6M9 12h6M9 16h4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "curator":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21a8 8 0 0 1 16 0M18 5l2-2M20 7l2-2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "replace":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M7 7h10l-3-3M17 17H7l3 3M17 7a7 7 0 0 1 1.7 7M7 17a7 7 0 0 1-1.7-7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "patron":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={common}>
          <path d="M12 21s-7-4.6-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.4-7 11-7 11Z" strokeLinecap="round" strokeLinejoin="round" />
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

function Section({
  title,
  intro,
  cards,
}: {
  title: string;
  intro: string;
  cards: { icon: string; title: string; body: string }[];
}) {
  return (
    <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">{intro}</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <ExplainerCard key={card.title} card={card} />
        ))}
      </div>
    </section>
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
          <span>How membership works</span>
        </div>

        <section className="rounded-[32px] border border-line bg-white p-8 shadow-sm sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">How membership works</p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            What happens after you find a room.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-muted">
            This is the practical path from browsing a room to joining, contributing, making introductions, and seeing what your membership unlocks.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/explore-groups" className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90">
              Browse rooms
            </Link>
            <Link href="/register" className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground">
              Create account
            </Link>
          </div>
        </section>

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">Joining a room</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            You do not join Trust50 by following everyone. You apply to specific rooms where your context fits.
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {membershipSteps.map((card) => (
              <ExplainerCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        <Section
          title="Membership rules"
          intro="These are the mechanics members usually want clarified before they join."
          cards={practicalCards}
        />

        <Section
          title="Inside a room"
          intro="After joining, the product centers on room questions, comments, support, and warm paths."
          cards={insideRoomCards}
        />

        <Section
          title="Curators and continuity"
          intro="Rooms have curators, but the room should not collapse if one person burns out, drifts, or stops serving members."
          cards={governanceCards}
        />

        <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight">What members see after joining</h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>Your feed shows questions, decisions, and candidate vouching from your rooms.</p>
            <p>Your room page shows active discussions, members at the table, patrons or scholarship details when relevant, and the room ledger.</p>
            <p>Your profile shows your rooms, reputation, helpful replies, and the context other members can use to understand where you can help.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
