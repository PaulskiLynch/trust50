"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type FormState = {
  name: string;
  email: string;
  password: string;
  company: string;
  role: string;
  location: string;
  stageIndustry: string;
  helpTags: string;
  workingOn: string;
  bio: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  company: "",
  role: "",
  location: "",
  stageIndustry: "",
  helpTags: "",
  workingOn: "",
  bio: "",
};

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M6.94 8.5H3.56V20h3.38V8.5ZM5.25 3A1.97 1.97 0 1 0 5.3 6.94 1.97 1.97 0 0 0 5.25 3ZM20.44 12.73c0-3.45-1.84-5.05-4.29-5.05-1.98 0-2.87 1.1-3.37 1.86V8.5H9.4c.04.69 0 11.5 0 11.5h3.38v-6.42c0-.34.02-.68.13-.93.27-.68.88-1.38 1.9-1.38 1.34 0 1.88 1.03 1.88 2.54V20h3.38v-7.27Z" />
    </svg>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const linkedInEnabled = process.env.NEXT_PUBLIC_LINKEDIN_ENABLED === "true";
  const [form, setForm] = useState<FormState>(initialState);
  const [flash, setFlash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLinkedInSigningIn, setIsLinkedInSigningIn] = useState(false);

  function updateField<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFlash(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to create account.");
      }

      const signInResult = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (signInResult?.error) {
        throw new Error("Account created, but sign in failed. Please try signing in.");
      }

      router.push("/");
      router.refresh();
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to create account.");
      setIsSubmitting(false);
    }
  }

  async function handleLinkedInLogin() {
    setFlash(null);
    setIsLinkedInSigningIn(true);
    await signIn("linkedin", { callbackUrl: "/" });
    setIsLinkedInSigningIn(false);
  }

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <span />
          <Link href="/" className="font-medium transition hover:text-foreground">
            Back to sign in
          </Link>
        </div>

        <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
          <div className="space-y-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/trust50-logo.png" alt="Trust50" className="h-48 w-48 rounded-[32px] object-contain" />
            <h1 className="text-3xl font-semibold tracking-tight">Join private rooms for trusted advice and warm introductions.</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              Start with a real profile so rooms can understand the context you bring before they invite you in.
            </p>
            {linkedInEnabled ? (
              <button
                type="button"
                onClick={() => void handleLinkedInLogin()}
                disabled={isLinkedInSigningIn}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line bg-[#0A66C2] px-5 py-3 text-sm font-medium text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                <LinkedInIcon />
                <span>{isLinkedInSigningIn ? "Connecting..." : "Continue with LinkedIn"}</span>
              </button>
            ) : null}
            <div className="grid gap-2 sm:grid-cols-3">
              {["50 max per room", "4 rooms per person", "Vouched access"].map((label) => (
                <div key={label} className="rounded-2xl border border-line bg-panel px-4 py-3 text-center text-xs font-medium text-foreground">
                  {label}
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-muted sm:col-span-2">
              <span className="block">Full name</span>
              <input
                type="text"
                value={form.name}
                onChange={(event) => updateField("name", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="Your name"
                autoComplete="name"
                required
              />
            </label>
            <label className="space-y-2 text-sm text-muted">
              <span className="block">Email</span>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="you@company.com"
                autoComplete="email"
                required
              />
            </label>
            <label className="space-y-2 text-sm text-muted">
              <span className="block">Password</span>
              <input
                type="password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="space-y-2 text-sm text-muted">
              <span className="block">Company</span>
              <input
                type="text"
                value={form.company}
                onChange={(event) => updateField("company", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="Your company"
                autoComplete="organization"
              />
            </label>
            <label className="space-y-2 text-sm text-muted">
              <span className="block">Role</span>
              <input
                type="text"
                value={form.role}
                onChange={(event) => updateField("role", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="Founder, operator, investor..."
                autoComplete="organization-title"
              />
            </label>
            <label className="space-y-2 text-sm text-muted">
              <span className="block">Location</span>
              <input
                type="text"
                value={form.location}
                onChange={(event) => updateField("location", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="City, region, or remote"
                autoComplete="address-level2"
              />
            </label>
            <label className="space-y-2 text-sm text-muted">
              <span className="block">Stage / industry</span>
              <input
                type="text"
                value={form.stageIndustry}
                onChange={(event) => updateField("stageIndustry", event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="Seed SaaS, pharma AI, property ops..."
              />
            </label>
            <label className="space-y-2 text-sm text-muted sm:col-span-2">
              <span className="block">What I can help with</span>
              <textarea
                value={form.helpTags}
                onChange={(event) => updateField("helpTags", event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="Hiring first sales lead, pharma AI adoption, fundraising strategy..."
                maxLength={300}
              />
            </label>
            <label className="space-y-2 text-sm text-muted sm:col-span-2">
              <span className="block">What I&apos;m working on now</span>
              <textarea
                value={form.workingOn}
                onChange={(event) => updateField("workingOn", event.target.value)}
                className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="A short live context field for better intros and advice."
                maxLength={240}
              />
            </label>
            <label className="space-y-2 text-sm text-muted sm:col-span-2">
              <span className="block">Short bio</span>
              <textarea
                value={form.bio}
                onChange={(event) => updateField("bio", event.target.value)}
                className="min-h-28 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="A few lines on the context you bring."
                maxLength={500}
              />
            </label>

            {flash ? (
              <div className="rounded-2xl border border-line bg-panel px-4 py-3 text-sm text-muted sm:col-span-2">
                {flash}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3 sm:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-foreground px-5 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Creating account..." : "Create account"}
              </button>
              <Link
                href="/"
                className="rounded-full border border-line bg-white px-5 py-3 text-sm font-medium text-foreground transition hover:border-foreground"
              >
                Back to sign in
              </Link>
            </div>
          </form>
        </section>

        <footer className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-muted">
          <Link href="/privacy" className="font-medium transition hover:text-foreground">
            Privacy policy
          </Link>
          <span>Terms</span>
          <Link href="/how-it-works" className="font-medium transition hover:text-foreground">
            How it works
          </Link>
        </footer>
      </div>
    </main>
  );
}
