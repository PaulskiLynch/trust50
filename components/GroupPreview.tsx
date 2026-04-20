type PreviewGroup = {
  id: string;
  name: string;
  metrics: string;
  summary: string;
  curatorLine: string;
};

type GroupPreviewProps = {
  groups: PreviewGroup[];
};

export function GroupPreview({ groups }: GroupPreviewProps) {
  return (
    <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">Example rooms</h2>
      <p className="mt-2 text-sm text-muted">These show how strong rooms are meant to feel once the first pilot rooms launch.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {groups.map((group) => (
          <div key={group.id} className="rounded-2xl border border-line bg-panel p-5">
            <h3 className="text-xl font-semibold text-foreground">{group.name}</h3>
            <p className="mt-3 text-sm font-medium text-foreground">{group.metrics}</p>
            <p className="mt-3 text-sm leading-6 text-muted">{group.summary}</p>
            <p className="mt-4 text-sm text-muted">{group.curatorLine}</p>
            <p className="mt-5 text-xs font-medium uppercase tracking-[0.14em] text-muted">Illustrative example</p>
          </div>
        ))}
      </div>
    </section>
  );
}
