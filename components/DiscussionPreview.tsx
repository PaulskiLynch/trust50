type DiscussionPreviewProps = {
  title: string;
  body: string;
  replies: { author: string; role: string; body: string }[];
};

export function DiscussionPreview({ title, body, replies }: DiscussionPreviewProps) {
  return (
    <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <p className="text-sm font-medium text-muted">Real discussions. Real decisions.</p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-muted">{body}</p>
      </div>

      <div className="mt-6 space-y-4">
        {replies.map((reply) => (
          <div key={`${reply.author}-${reply.body}`} className="rounded-2xl border border-line bg-panel px-4 py-4">
            <p className="text-sm font-medium text-foreground">{reply.author}</p>
            <p className="mt-1 text-xs text-muted">{reply.role}</p>
            <p className="mt-2 text-sm leading-6 text-foreground">&ldquo;{reply.body}&rdquo;</p>
          </div>
        ))}
      </div>

      <div className="mt-5 rounded-2xl border border-foreground/20 bg-stone-950 px-4 py-4 text-white">
        <p className="text-sm font-medium">Result</p>
        <p className="mt-2 text-sm text-stone-200">VP Product hire scoped and search started within 48 hours.</p>
      </div>
    </section>
  );
}
