type SocialProofProps = {
  activeCount: number;
  waitlistCount: number;
  movedForwardCount: number;
};

export function SocialProof({ activeCount, waitlistCount, movedForwardCount }: SocialProofProps) {
  return (
    <section className="rounded-[28px] border border-line bg-white px-6 py-4 shadow-sm">
      <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-medium text-foreground">
        <span>{activeCount} founders active</span>
        <span className="text-muted">·</span>
        <span>{waitlistCount} waiting</span>
        <span className="text-muted">·</span>
        <span>{movedForwardCount} discussions moved forward this week</span>
      </div>
    </section>
  );
}

