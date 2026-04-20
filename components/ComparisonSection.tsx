const rows = [
  {
    label: "Room size",
    slack: "Unlimited (becomes noise)",
    circle: "Unlimited (curator as broadcaster)",
    substack: "1-to-many (no peer help)",
    trust50: "Max 50 (quality stays legible)",
  },
  {
    label: "Member limits",
    slack: "Join 100+ groups",
    circle: "Join unlimited",
    substack: "Subscribe to 100+",
    trust50: "Join 4 max (intentional choice)",
  },
  {
    label: "Revenue",
    slack: "$0 to curator",
    circle: "80-90% to curator",
    substack: "90% to creator",
    trust50: "80% to curator",
  },
  {
    label: "Governance",
    slack: "Owner = dictator",
    circle: "Owner = dictator",
    substack: "Creator = dictator",
    trust50: "Room can replace curator",
  },
  {
    label: "What you're buying",
    slack: "Software",
    circle: "Community software",
    substack: "Content",
    trust50: "Trusted access + stewardship",
  },
];

export function ComparisonSection() {
  return (
    <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <div className="max-w-3xl">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">How it&apos;s different from everything else</h2>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-line">
        <div className="grid grid-cols-[1.1fr_repeat(4,minmax(0,1fr))] border-b border-line bg-panel text-xs font-semibold uppercase tracking-[0.12em] text-muted">
          <div className="px-4 py-3">Model</div>
          <div className="px-4 py-3">Slack / Discord</div>
          <div className="px-4 py-3">Circle / Mighty</div>
          <div className="px-4 py-3">Substack / Patreon</div>
          <div className="px-4 py-3 text-foreground">Trust50</div>
        </div>
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[1.1fr_repeat(4,minmax(0,1fr))] border-b border-line last:border-b-0"
          >
            <div className="bg-white px-4 py-4 text-sm font-medium text-foreground">{row.label}</div>
            <div className="bg-white px-4 py-4 text-sm text-muted">{row.slack}</div>
            <div className="bg-white px-4 py-4 text-sm text-muted">{row.circle}</div>
            <div className="bg-white px-4 py-4 text-sm text-muted">{row.substack}</div>
            <div className="bg-panel px-4 py-4 text-sm font-medium text-foreground">{row.trust50}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
