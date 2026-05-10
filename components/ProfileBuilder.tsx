"use client";

import { useState } from "react";

type ProfileBuilderProps = {
  profile: {
    name: string | null;
    company?: string | null;
    role?: string | null;
    location?: string | null;
    stageIndustry?: string | null;
    helpTags?: string | null;
    workingOn?: string | null;
    fitRoles?: string | null;
    proof?: string | null;
    introPolicy?: string | null;
    bio?: string | null;
  };
};

type ProfileField = {
  key:
    | "role"
    | "company"
    | "location"
    | "stageIndustry"
    | "helpTags"
    | "workingOn"
    | "fitRoles"
    | "proof"
    | "introPolicy";
  label: string;
  placeholder: string;
  textarea?: boolean;
};

const fields: ProfileField[] = [
  {
    key: "role",
    label: "Role",
    placeholder: "Founder, investor, specialist...",
  },
  {
    key: "company",
    label: "Company",
    placeholder: "Company or independent practice",
  },
  {
    key: "location",
    label: "Location",
    placeholder: "Warsaw, London, remote...",
  },
  {
    key: "stageIndustry",
    label: "Stage / industry",
    placeholder: "Seed SaaS, pharma AI, property ops...",
  },
  {
    key: "helpTags",
    label: "What I can help with",
    placeholder: "Hiring first sales lead, fundraising strategy, pharma AI adoption",
    textarea: true,
  },
  {
    key: "workingOn",
    label: "What I'm working on now",
    placeholder: "A short live context field for better intros and advice",
    textarea: true,
  },
  {
    key: "fitRoles",
    label: "Rooms I'm a fit for",
    placeholder: "Founder/operator/investor/specialist, plus industries",
    textarea: true,
  },
  {
    key: "proof",
    label: "Proof / credibility",
    placeholder: "Companies built, years experience, capital raised, team size, notable roles...",
    textarea: true,
  },
  {
    key: "introPolicy",
    label: "Warm intro policy",
    placeholder: "I'm happy to make intros when I know both sides and the ask is specific.",
    textarea: true,
  },
] as const;

export function ProfileBuilder({ profile }: ProfileBuilderProps) {
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((field) => [field.key, String(profile[field.key] || "")])),
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const completed = fields.filter((field) => form[field.key].trim()).length;

  async function handleSave() {
    setSaving(true);
    setFlash(null);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save profile.");
      }

      setFlash("Profile saved.");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="build-profile" className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Build my profile</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            Complete these once. Leave anything blank. Your profile helps curators and members understand where you can contribute.
          </p>
        </div>
        <span className="rounded-full border border-line bg-panel px-3 py-1.5 text-xs font-medium text-muted">
          {completed}/{fields.length} complete
        </span>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <label key={field.key} className={`space-y-2 text-sm text-muted ${field.textarea ? "sm:col-span-2" : ""}`}>
            <span className="block">{field.label}</span>
            {field.textarea ? (
              <textarea
                value={form[field.key]}
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                className="min-h-24 w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder={field.placeholder}
              />
            ) : (
              <input
                value={form[field.key]}
                onChange={(event) => setForm((current) => ({ ...current, [field.key]: event.target.value }))}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder={field.placeholder}
              />
            )}
          </label>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
        {flash ? <p className="text-sm text-muted">{flash}</p> : null}
      </div>
    </section>
  );
}
