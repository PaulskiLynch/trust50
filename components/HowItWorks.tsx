const steps = [
  {
    hop: "Hop 1: Access",
    title: "Small, trusted groups",
    body: "",
  },
  {
    hop: "Hop 2: Ask",
    title: "Share context clearly",
    body: "",
  },
  {
    hop: "Hop 3: Replies",
    title: "From people who've done it",
    body: "",
  },
  {
    hop: "Hop 4: Result",
    title: "Decisions that move things forward",
    body: "",
  },
];

export function HowItWorks() {
  return (
    <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">How it works →</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">How it works</h2>
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">A repeatable loop, not a one-off</p>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step) => (
          <div key={step.title} className="space-y-2">
            <p className="text-sm font-medium text-muted">{step.hop}</p>
            <h3 className="mt-2 text-lg font-semibold text-foreground">{step.title}</h3>
            {step.body ? <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p> : null}
          </div>
        ))}
      </div>
      <p className="mt-4 text-sm text-muted">Ask well, get context-rich replies, act, then come back with the next real decision.</p>
    </section>
  );
}
