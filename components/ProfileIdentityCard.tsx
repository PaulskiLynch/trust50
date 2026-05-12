"use client";

import { useState } from "react";

type ProfileIdentityCardProps = {
  profile: {
    name: string | null;
    bio?: string | null;
  };
};

export function ProfileIdentityCard({ profile }: ProfileIdentityCardProps) {
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "Your profile is a feed of judgment, not a resume.");
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setFlash(null);

    try {
      const response = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save profile.");
      }

      setName(data.name || "");
      setBio(data.bio || "");
      setFlash("Saved.");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">Name</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-2xl font-semibold tracking-tight text-foreground outline-none transition focus:border-foreground"
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="sr-only">Tagline</span>
          <input
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted outline-none transition focus:border-foreground"
            placeholder="Your profile is a feed of judgment, not a resume."
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {flash ? <p className="text-sm text-muted">{flash}</p> : null}
      </div>
    </section>
  );
}
