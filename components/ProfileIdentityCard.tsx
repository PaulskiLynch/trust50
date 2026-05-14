"use client";

import { useState } from "react";

type ProfileIdentityCardProps = {
  profile: {
    name: string | null;
    bio?: string | null;
    avatarUrl?: string | null;
    trustCount: number;
  };
};

function trustStatus(score: number) {
  if (score >= 151) return "Exceptional";
  if (score >= 101) return "Deeply trusted";
  if (score >= 51) return "Respected";
  if (score >= 21) return "Trusted";
  return "Building trust";
}

function paddedTrustScore(score: number) {
  return String(Math.min(score, 200)).padStart(2, "0");
}

export function ProfileIdentityCard({ profile }: ProfileIdentityCardProps) {
  const [name, setName] = useState(profile.name || "");
  const [bio, setBio] = useState(profile.bio || "Your profile is a feed of judgment, not a resume.");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || "");
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
          avatarUrl: avatarUrl.trim(),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to save profile.");
      }

      setName(data.name || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatarUrl || "");
      setFlash("Saved.");
    } catch (error) {
      setFlash(error instanceof Error ? error.message : "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[24px] border border-line bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="shrink-0">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={name || "Profile image"}
              className="h-20 w-20 rounded-full object-cover ring-1 ring-line"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/profile-placeholder.svg"
              alt={name || "Profile image"}
              className="h-20 w-20 rounded-full object-cover ring-1 ring-line"
            />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
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
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted">Profile image URL</span>
            <div className="flex items-center gap-2">
              <input
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm text-foreground outline-none transition focus:border-foreground"
                placeholder="https://..."
              />
              <button
                type="button"
                onClick={() => setAvatarUrl("")}
                className="rounded-full border border-line bg-white px-3 py-2 text-xs font-medium text-muted transition hover:border-foreground hover:text-foreground"
              >
                Clear
              </button>
            </div>
          </label>
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Trust Level</p>
        <div className="mt-3 space-y-2">
          <div className="h-2 overflow-hidden rounded-full bg-panel">
            <div
              className="h-full rounded-full bg-foreground transition-[width]"
              style={{ width: `${Math.max(4, (Math.min(profile.trustCount, 200) / 200) * 100)}%` }}
            />
          </div>
          <p className="text-sm font-medium text-foreground">
            {paddedTrustScore(profile.trustCount)} / 200 <span className="text-muted">/</span> {trustStatus(profile.trustCount)}
          </p>
        </div>
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
