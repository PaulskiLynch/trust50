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
  bio: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  password: "",
  company: "",
  role: "",
  bio: "",
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [flash, setFlash] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>Create account</p>
          <Link href="/" className="font-medium transition hover:text-foreground">
            Back to sign in
          </Link>
        </div>

        <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight">Create your Trust50 account</h1>
            <p className="max-w-2xl text-sm leading-7 text-muted">
              Start with a real profile so you can join rooms, vote on new members, and contribute with context.
            </p>
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
      </div>
    </main>
  );
}
