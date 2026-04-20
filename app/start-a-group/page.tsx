"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CreateGroupResponse = {
  id: string;
  error?: string;
};

export default function StartAGroupPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [source, setSource] = useState("A new room idea");
  const [signal, setSignal] = useState("");
  const [note, setNote] = useState("");
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [whoFor, setWhoFor] = useState("");
  const [whoNotFor, setWhoNotFor] = useState("");
  const [valueProp, setValueProp] = useState("");
  const [pricingMode, setPricingMode] = useState<"free" | "paid">("free");
  const [monthlyPrice, setMonthlyPrice] = useState("50");
  const [flash, setFlash] = useState<string | null>(null);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  const isSignedIn = !!session?.user?.id;

  async function handleInterestSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFlash(null);
    setIsSubmittingInterest(true);

    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, source, signal, note, kind: "curator" }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save your interest.");

      setFlash("Thanks. We'll reach out when we open the next curator cohort.");
      setEmail("");
      setName("");
      setSource("A new room idea");
      setSignal("");
      setNote("");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to save your interest.");
    } finally {
      setIsSubmittingInterest(false);
    }
  }

  async function handleCreateGroup(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFlash(null);
    setIsCreatingGroup(true);

    try {
      const price =
        pricingMode === "paid" ? Number.parseInt(monthlyPrice.trim() || "0", 10) : null;

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: groupName,
          description,
          who_for: whoFor,
          who_not_for: whoNotFor,
          value_prop: valueProp,
          price,
        }),
      });

      const data = (await response.json()) as CreateGroupResponse;
      if (!response.ok) {
        throw new Error(data.error || "Unable to create your room.");
      }

      router.push(`/groups/${data.id}`);
      router.refresh();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to create your room.");
    } finally {
      setIsCreatingGroup(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>{isSignedIn ? "Create a room" : "Start a group"}</p>
          <Link href="/landing" className="font-medium transition hover:text-foreground">
            Back to landing page
          </Link>
        </div>

        {isSignedIn ? (
          <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">Create your first room</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Start with a clear room idea, invite a few strong members, and let the room earn its
              shape from real discussions.
            </p>

            <form onSubmit={handleCreateGroup} className="mt-8 space-y-4">
              <label className="space-y-2 text-sm text-muted">
                <span className="block">Room name</span>
                <input
                  type="text"
                  value={groupName}
                  onChange={(event) => setGroupName(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="Digital pharma executives"
                  maxLength={80}
                  required
                />
              </label>

              <label className="space-y-2 text-sm text-muted">
                <span className="block">What is the room for?</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="min-h-28 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="A private room for senior leaders working through AI adoption, operating model decisions, and difficult team tradeoffs."
                  maxLength={500}
                />
              </label>

              <label className="space-y-2 text-sm text-muted">
                <span className="block">Who is it for?</span>
                <textarea
                  value={whoFor}
                  onChange={(event) => setWhoFor(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="Founders, operators, or specialists with shared context and real decisions to make."
                  maxLength={400}
                  required
                />
              </label>

              <label className="space-y-2 text-sm text-muted">
                <span className="block">Who is it not for?</span>
                <textarea
                  value={whoNotFor}
                  onChange={(event) => setWhoNotFor(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="People looking for broad networking, beginner advice, or passive lurking."
                  maxLength={400}
                  required
                />
              </label>

              <label className="space-y-2 text-sm text-muted">
                <span className="block">What should members get from it?</span>
                <textarea
                  value={valueProp}
                  onChange={(event) => setValueProp(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="Faster decisions, sharper operator context, and direct access to people who have already handled similar tradeoffs."
                  maxLength={400}
                  required
                />
              </label>

              <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                <p className="text-sm font-medium text-foreground">Pricing</p>
                <p className="mt-1 text-sm text-muted">
                  Start free if you want to prove the room first, or set a monthly price now.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setPricingMode("free")}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      pricingMode === "free"
                        ? "border-foreground bg-foreground text-white"
                        : "border-line bg-white text-foreground hover:border-foreground"
                    }`}
                  >
                    Free room
                  </button>
                  <button
                    type="button"
                    onClick={() => setPricingMode("paid")}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      pricingMode === "paid"
                        ? "border-foreground bg-foreground text-white"
                        : "border-line bg-white text-foreground hover:border-foreground"
                    }`}
                  >
                    Paid room
                  </button>
                </div>

                {pricingMode === "paid" ? (
                  <label className="mt-4 block space-y-2 text-sm text-muted">
                    <span className="block">Monthly price per member (EUR)</span>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      value={monthlyPrice}
                      onChange={(event) => setMonthlyPrice(event.target.value)}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                    />
                  </label>
                ) : null}
              </div>

              {flash ? (
                <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">
                  {flash}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isCreatingGroup || status === "loading"}
                  className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreatingGroup || status === "loading" ? "Creating..." : "Create room"}
                </button>
                <Link
                  href="/how-it-works"
                  className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  See how Trust50 works
                </Link>
              </div>
            </form>
          </section>
        ) : (
          <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">Join the waitlist to create a room</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Trust50 is in private beta. We&apos;re working with the first curator cohort now,
              then opening room creation to more operators with real networks and clear room ideas.
            </p>

            <div className="mt-6 rounded-2xl border border-line bg-panel px-4 py-4 text-sm text-muted">
              <p className="font-medium text-foreground">Want to create a real room right now?</p>
              <p className="mt-1">
                Create an account or sign in first. Signed-in members can already start real rooms.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href="/register"
                  className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90"
                >
                  Create account
                </Link>
                <Link
                  href="/"
                  className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
                >
                  Sign in
                </Link>
              </div>
            </div>

            <form onSubmit={handleInterestSubmit} className="mt-8 space-y-4">
              <label className="space-y-2 text-sm text-muted">
                <span className="block">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="space-y-2 text-sm text-muted">
                <span className="block">Your name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="Your name"
                />
              </label>
              <label className="space-y-2 text-sm text-muted">
                <span className="block">What are you building from?</span>
                <select
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                >
                  <option>A new room idea</option>
                  <option>An existing group</option>
                  <option>A waiting list or clear demand</option>
                  <option>An audience I already know well</option>
                </select>
              </label>
              <label className="space-y-2 text-sm text-muted">
                <span className="block">What signal do you already have?</span>
                <textarea
                  value={signal}
                  onChange={(event) => setSignal(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="Examples: 35 people in a WhatsApp group, 22 already waiting, founders ask me about this every week."
                  maxLength={500}
                />
              </label>
              <label className="space-y-2 text-sm text-muted">
                <span className="block">What room would you run?</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  className="min-h-32 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                  placeholder="What room would you run, who is it for, and would you start free or paid?"
                  maxLength={1000}
                />
              </label>

              {flash ? (
                <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">
                  {flash}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmittingInterest}
                className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmittingInterest ? "Saving..." : "Join curator waitlist"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
