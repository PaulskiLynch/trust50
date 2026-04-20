import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="rounded-[28px] border border-line bg-panel p-8 shadow-sm">
      <div className="max-w-4xl space-y-4">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">The honest bottom line</h2>
        <div className="space-y-3 text-sm leading-7 text-muted">
          <p>
            80% of rooms stay free. They build the network, seed discovery, and create conversion paths. The 20% of
            rooms that go paid fund the infrastructure for everyone.
          </p>
          <p>
            Curators don&apos;t own rooms forever. They earn the right to run them. If they stop serving the room, the
            room replaces them.
          </p>
          <p>
            The 50-person cap is not a limitation. It&apos;s the feature that keeps quality legible. The 4-room limit
            forces intentional choices over hoarding access you&apos;ll never use.
          </p>
          <p className="font-medium text-foreground">
            If you can fill and maintain two or three paid rooms, Trust50 can replace a salary. And for members:
            you&apos;re never more than 4 hops from the connection you actually need.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/start-a-group"
            className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
          >
            Start a group
          </Link>
          <Link
            href="/explore-groups"
            className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
          >
            Explore groups
          </Link>
        </div>
      </div>
    </section>
  );
}
