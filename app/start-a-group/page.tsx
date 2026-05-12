"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ENTRY_RULES, TRUST_TAXONOMY, TAXONOMY_RULE, getTaxonomyNode, type TrustDomain } from "@/lib/taxonomy";

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
  const [domain, setDomain] = useState<TrustDomain>("Professional");
  const [category, setCategory] = useState("Startups");
  const [specialty, setSpecialty] = useState("");
  const [entryRule, setEntryRule] = useState<(typeof ENTRY_RULES)[number]>("Vouch required");
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [whoFor, setWhoFor] = useState("");
  const [whoNotFor, setWhoNotFor] = useState("");
  const [valueProp, setValueProp] = useState("");
  const [pricingMode, setPricingMode] = useState<"free" | "paid">("free");
  const [monthlyPrice, setMonthlyPrice] = useState("50");
  const [creationStep, setCreationStep] = useState(1);
  const [flash, setFlash] = useState<string | null>(null);
  const [isSubmittingInterest, setIsSubmittingInterest] = useState(false);
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [proposalName, setProposalName] = useState("");
  const [proposalReason, setProposalReason] = useState("");
  const [proposalSecond, setProposalSecond] = useState("");
  const [proposalEmail, setProposalEmail] = useState(session?.user?.email || "");
  const [proposalFlash, setProposalFlash] = useState<string | null>(null);

  const isSignedIn = !!session?.user?.id;
  const selectedTaxonomy = getTaxonomyNode(domain);
  const suggestedGroupName = specialty.trim() ? `${category}: ${specialty.trim()}` : `${category} room`;

  function entryRuleHelp(rule: (typeof ENTRY_RULES)[number]) {
    if (rule === "Invite only") return "The curator adds members directly. No open enrollment.";
    if (rule === "Vouch required") return "A qualified applicant needs two member vouches before admission.";
    if (rule === "Application + curator approval") return "Members apply and the curator decides who earns a seat.";
    return "The curator reviews fit, then members add the trust signal.";
  }

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

    if (!category.trim()) {
      setCreationStep(1);
      setFlash("Choose the category this room belongs to.");
      return;
    }

    if (!specialty.trim()) {
      setCreationStep(2);
      setFlash("Add a specialty so members know why this room needs trust.");
      return;
    }

    if (!description.trim()) {
      setCreationStep(3);
      setFlash("Describe the decisions this room helps with.");
      return;
    }

    if (!whoFor.trim()) {
      setCreationStep(4);
      setFlash("Add who belongs in this room.");
      return;
    }

    setIsCreatingGroup(true);

    try {
      const price =
        pricingMode === "paid" ? Number.parseInt(monthlyPrice.trim() || "0", 10) : null;
      const finalGroupName = groupName.trim() || suggestedGroupName;

      const response = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: finalGroupName,
          description: `${description}\n\nTaxonomy: ${domain} / ${category} / ${specialty}.\nEntry: ${entryRule}.`,
          who_for: whoFor,
          who_not_for: whoNotFor || "People looking for open enrollment, broad networking, passive lurking, or generic beginner advice.",
          value_prop: valueProp || `Specific help with the decisions this room exists to handle: ${description || finalGroupName}. Entry is ${entryRule.toLowerCase()}.`,
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

  async function handleDomainProposal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setProposalFlash(null);

    if (!proposalName.trim()) {
      setProposalFlash("Name the domain you want to propose.");
      return;
    }

    if (!proposalEmail.trim()) {
      setProposalFlash("Add an email so we can follow up on the proposal.");
      return;
    }

    setIsSubmittingInterest(true);

    try {
      const response = await fetch("/api/interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: proposalEmail.trim().toLowerCase(),
          kind: "curator",
          name: session?.user?.name || name || "",
          source: "Proposed new trust domain",
          signal: proposalName.trim(),
          note: [
            proposalReason.trim() ? `Why this domain belongs here: ${proposalReason.trim()}` : "",
            proposalSecond.trim() ? `Who would second it: ${proposalSecond.trim()}` : "",
            "Activation rule: first member proposes, second member seconds, then the domain can become active.",
          ]
            .filter(Boolean)
            .join("\n\n"),
        }),
      });

      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to save your proposal.");

      setProposalFlash("Proposal saved. Once a second member seconds it, this can become an active domain.");
      setProposalName("");
      setProposalReason("");
      setProposalSecond("");
    } catch (error) {
      setProposalFlash(error instanceof Error ? error.message : "Unable to save your proposal.");
    } finally {
      setIsSubmittingInterest(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>{isSignedIn ? "Create a room" : "Start a group"}</p>
          <Link href={isSignedIn ? "/" : "/landing"} className="font-medium transition hover:text-foreground">
            {isSignedIn ? "Back to Wire" : "Back to landing page"}
          </Link>
        </div>

        {isSignedIn ? (
          <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
            <h1 className="text-3xl font-semibold tracking-tight">Create your first room</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
              Start with the decision people help each other make. Trust50 can infer the rest as the room earns its shape from real discussions.
            </p>

            <form onSubmit={handleCreateGroup} className="mt-8 space-y-4">
              <div className="flex gap-2">
                {[
                  { step: 1, label: "Domain" },
                  { step: 2, label: "Specialty" },
                  { step: 3, label: "Decisions" },
                  { step: 4, label: "Rules" },
                ].map(({ step, label }) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => setCreationStep(step)}
                    className={`flex-1 rounded-full px-2 py-2 text-xs font-medium transition ${
                      creationStep === step ? "bg-foreground text-white" : "bg-panel text-muted hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {creationStep === 1 ? (
                <section className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Step 1</p>
                    <h2 className="mt-2 text-xl font-semibold">Choose the trust domain</h2>
                  </div>
                  <p className="rounded-2xl bg-panel px-4 py-3 text-sm text-muted">{TAXONOMY_RULE}</p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TRUST_TAXONOMY.map((node) => (
                      <button
                        key={node.domain}
                        type="button"
                        onClick={() => {
                          setDomain(node.domain);
                          setCategory(node.categories[0]);
                        }}
                        className={`rounded-2xl border px-3 py-3 text-left text-sm font-medium transition ${
                          domain === node.domain
                            ? "border-foreground bg-foreground text-white"
                            : "border-line bg-white text-foreground hover:border-foreground"
                        }`}
                      >
                        {node.domain}
                      </button>
                    ))}
                  </div>
                  <label className="space-y-2 text-sm text-muted">
                    <span className="block">Category</span>
                    <select
                      value={category}
                      onChange={(event) => setCategory(event.target.value)}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                    >
                      {selectedTaxonomy.categories.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-2xl bg-panel px-4 py-3 text-sm text-muted">
                    Trust test: <span className="font-medium text-foreground">{selectedTaxonomy.trustTest}</span>
                  </div>

                  <section className="rounded-2xl border border-line bg-white p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Don&apos;t see your domain?</p>
                      <p className="text-sm text-muted">Propose one. First member to propose plus second member to second makes it active.</p>
                    </div>

                    <form onSubmit={handleDomainProposal} className="mt-4 space-y-3">
                      <label className="space-y-2 text-sm text-muted">
                        <span className="block">Proposed domain</span>
                        <input
                          type="text"
                          value={proposalName}
                          onChange={(event) => setProposalName(event.target.value)}
                          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                          placeholder="Example: Education, Climate, Supply Chains"
                          maxLength={80}
                        />
                      </label>
                      <label className="space-y-2 text-sm text-muted">
                        <span className="block">Why does trust change the quality of this domain?</span>
                        <textarea
                          value={proposalReason}
                          onChange={(event) => setProposalReason(event.target.value)}
                          className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                          placeholder="Explain the kind of judgment, access, or vulnerability that makes this a trust-shaped domain."
                          maxLength={400}
                        />
                      </label>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="space-y-2 text-sm text-muted">
                          <span className="block">Who would second it?</span>
                          <input
                            type="text"
                            value={proposalSecond}
                            onChange={(event) => setProposalSecond(event.target.value)}
                            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                            placeholder="A member, curator, or circle that would back this"
                            maxLength={120}
                          />
                        </label>
                        <label className="space-y-2 text-sm text-muted">
                          <span className="block">Contact email</span>
                          <input
                            type="email"
                            value={proposalEmail}
                            onChange={(event) => setProposalEmail(event.target.value)}
                            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                            placeholder="you@company.com"
                            maxLength={160}
                          />
                        </label>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          type="submit"
                          disabled={isSubmittingInterest}
                          className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSubmittingInterest ? "Saving..." : "+ Propose a new domain"}
                        </button>
                        {proposalFlash ? <p className="text-sm text-muted">{proposalFlash}</p> : null}
                      </div>
                    </form>
                  </section>
                </section>
              ) : null}

              {creationStep === 2 ? (
                <section className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Step 2</p>
                    <h2 className="mt-2 text-xl font-semibold">Choose the specialty</h2>
                  </div>
                  <label className="space-y-2 text-sm text-muted">
                    <span className="block">Specialty</span>
                    <input
                      type="text"
                      value={specialty}
                      onChange={(event) => setSpecialty(event.target.value)}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                      placeholder="Seed-stage fintech founders navigating fundraising and senior hiring"
                      maxLength={140}
                      required
                    />
                  </label>
                  <p className="rounded-2xl bg-panel px-4 py-3 text-sm text-muted">
                    Path: {domain} / {category} / {specialty || "your specialty"}
                  </p>
                </section>
              ) : null}

              {creationStep === 3 ? (
                <section className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Step 3</p>
                    <h2 className="mt-2 text-xl font-semibold">Describe the decisions</h2>
                  </div>
                  <label className="space-y-2 text-sm text-muted">
                    <span className="block">What kinds of decisions should members help each other make?</span>
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="min-h-32 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                      placeholder="AI adoption, operating model decisions, senior hiring, and board-level tradeoffs inside regulated pharma teams."
                      maxLength={500}
                      required
                    />
                  </label>
                  <p className="rounded-2xl bg-panel px-4 py-3 text-sm text-muted">
                    Good rooms are specific enough that members instantly know what kind of help belongs there.
                  </p>
                </section>
              ) : null}

              {creationStep === 4 ? (
                <section className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Step 4</p>
                    <h2 className="mt-2 text-xl font-semibold">Entry rules, price, and name</h2>
                  </div>
                  <label className="space-y-2 text-sm text-muted">
                    <span className="block">How does someone earn a seat?</span>
                    <select
                      value={entryRule}
                      onChange={(event) => setEntryRule(event.target.value as (typeof ENTRY_RULES)[number])}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                    >
                      {ENTRY_RULES.map((rule) => (
                        <option key={rule} value={rule}>
                          {rule}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="rounded-2xl bg-panel px-4 py-3 text-sm text-muted">{entryRuleHelp(entryRule)}</p>

                  <div className="rounded-2xl border border-line bg-panel px-4 py-4">
                    <p className="text-sm font-medium text-foreground">Price</p>
                    <p className="mt-1 text-sm text-muted">
                      80% of rooms are free. Paid rooms should feel earned, not sold.
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
                        <span className="block text-xs">You keep 80%. Trust50 keeps 20%.</span>
                      </label>
                    ) : null}
                  </div>

                  <label className="space-y-2 text-sm text-muted">
                    <span className="block">Room name</span>
                    <input
                      type="text"
                      value={groupName}
                      onChange={(event) => setGroupName(event.target.value)}
                      className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                      placeholder={suggestedGroupName}
                      maxLength={80}
                    />
                    <span className="block text-xs">Suggested: {suggestedGroupName}</span>
                  </label>

                  <label className="space-y-2 text-sm text-muted">
                    <span className="block">Who is it for?</span>
                    <textarea
                      value={whoFor}
                      onChange={(event) => setWhoFor(event.target.value)}
                      className="min-h-28 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                      placeholder="Senior pharma, biotech, and health AI operators with direct responsibility for digital transformation decisions."
                      maxLength={400}
                      required
                    />
                  </label>

                  <details className="rounded-2xl bg-panel px-4 py-3">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">Optional: tune the room draft</summary>
                    <div className="mt-4 space-y-4">
                      <label className="space-y-2 text-sm text-muted">
                        <span className="block">Who is it not for?</span>
                        <textarea
                          value={whoNotFor}
                          onChange={(event) => setWhoNotFor(event.target.value)}
                          className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                          placeholder="People looking for broad networking, beginner advice, or passive lurking."
                          maxLength={400}
                        />
                      </label>

                      <label className="space-y-2 text-sm text-muted">
                        <span className="block">What kinds of help should people expect here?</span>
                        <textarea
                          value={valueProp}
                          onChange={(event) => setValueProp(event.target.value)}
                          className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                          placeholder="Faster decisions, sharper operator context, and direct access to people who have already handled similar tradeoffs."
                          maxLength={400}
                        />
                      </label>
                    </div>
                  </details>
                </section>
              ) : null}

              {flash ? (
                <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted">
                  {flash}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                {creationStep > 1 ? (
                  <button
                    type="button"
                    onClick={() => setCreationStep((step) => Math.max(1, step - 1))}
                    className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
                  >
                    Back
                  </button>
                ) : null}
                {creationStep < 4 ? (
                  <button
                    type="button"
                    onClick={() => setCreationStep((step) => Math.min(4, step + 1))}
                    className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90"
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isCreatingGroup || status === "loading"}
                    className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreatingGroup || status === "loading" ? "Creating..." : "Create room"}
                  </button>
                )}
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
