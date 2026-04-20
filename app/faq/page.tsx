"use client";

import Link from "next/link";

import { FAQSection } from "@/components/FAQSection";

export default function FAQPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:py-14">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>FAQ</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/landing" className="font-medium transition hover:text-foreground">
              Back to landing
            </Link>
            <Link href="/" className="font-medium transition hover:text-foreground">
              My groups
            </Link>
          </div>
        </div>

        <FAQSection />
      </div>
    </main>
  );
}
