"use client";

import Image from "next/image";
import Link from "next/link";

type HeroProps = {
  onTestLogin: () => void;
  isLoggingIn: boolean;
  isSignedIn: boolean;
};

export function Hero({ onTestLogin, isLoggingIn, isSignedIn }: HeroProps) {
  return (
    <section className="rounded-[32px] border border-line bg-panel p-8 shadow-sm sm:p-10">
      <div className="flex items-start justify-between gap-6">
        <div className="space-y-3">
          <Image
            src="/trust50-logo.png"
            alt="Trust50"
            width={640}
            height={214}
            className="h-auto w-[26rem] sm:w-[32rem]"
            priority
          />
          <p className="pl-2 text-xs font-medium uppercase tracking-[0.24em] text-muted">
            Powered by 4 hops
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {isSignedIn ? (
            <Link
              href="/"
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
            >
              My groups
            </Link>
          ) : (
            <button
              type="button"
              onClick={onTestLogin}
              disabled={isLoggingIn}
              className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoggingIn ? "Signing in..." : "Test login"}
            </button>
          )}
        </div>
      </div>

      <div className="mt-8 max-w-3xl space-y-4">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Better decisions come from the right 50 people, not the internet.
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted sm:text-lg">
          Small, trusted rooms where experienced operators help you think through real decisions and the curators who
          run them get paid for it.
        </p>
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

      <div className="mt-8 space-y-3">
        <div className="rounded-2xl border border-line bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Built for founders &amp; operators at companies like</p>
          <p className="mt-2 text-sm font-medium text-foreground">Stripe · Google · Revolut · Roche · Novartis</p>
        </div>
      </div>
    </section>
  );
}
