"use client";

import { useState } from "react";

export function TrustSection() {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-[28px] border border-line bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Do we ever sell your data?</h2>
        </div>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="rounded-full border border-line bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:border-foreground"
        >
          {open ? "Hide answer" : "See answer"}
        </button>
      </div>

      {open ? (
        <div className="mt-5 rounded-2xl border border-line bg-panel p-5">
          <p className="text-lg font-semibold text-foreground">Never.</p>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-muted">
            Trust50 is built around trust. Your discussions are private, and your data is not sold or used for advertising.
          </p>
        </div>
      ) : null}
    </section>
  );
}
