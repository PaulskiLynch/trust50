import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | Trust50",
  description: "How Trust50 collects, uses, and protects personal information.",
};

const sections = [
  {
    title: "What We Collect",
    body: [
      "We collect the information you give us directly, such as your name, email address, password, profile details, and anything you add to your Trust50 profile.",
      "If you sign in with LinkedIn, we may receive your name, profile image, and email address from LinkedIn, depending on what LinkedIn shares with us.",
      "We also collect activity inside the product, such as circle membership, applications, discussions, replies, votes, trust actions, and messages you send through the platform.",
    ],
  },
  {
    title: "How We Use Information",
    body: [
      "We use your information to run Trust50, create and secure your account, show your profile to other members where appropriate, support discussions and introductions, and help circles function as intended.",
      "We may also use information to improve the product, investigate misuse, enforce our rules, and communicate important updates about your account or the service.",
    ],
  },
  {
    title: "What Other Members Can See",
    body: [
      "Because Trust50 is a network product, some of your information is visible to other members when you participate. That may include your name, profile image, headline, profile details, circle membership, and the content you post or reply with inside circles.",
      "Trust actions are designed to be socially meaningful, but we aim to limit unnecessary exposure. Where the product shows aggregate trust signals, we may avoid showing the identity of the person who created that trust signal.",
    ],
  },
  {
    title: "How We Share Information",
    body: [
      "We do not sell your personal information.",
      "We may share information with service providers who help us operate Trust50, such as hosting, authentication, database, and infrastructure providers.",
      "We may also disclose information if required by law, to protect the safety of users, or to investigate fraud, abuse, or security issues.",
    ],
  },
  {
    title: "Retention",
    body: [
      "We keep information for as long as we need it to operate the service, maintain security, comply with legal obligations, and resolve disputes.",
      "Some information tied to circles, discussions, and moderation history may be retained for continuity, trust, and safety even after an account becomes inactive.",
    ],
  },
  {
    title: "Security",
    body: [
      "We use reasonable technical and organizational measures to protect personal information. No method of storage or transmission is completely secure, so we cannot guarantee absolute security.",
    ],
  },
  {
    title: "Your Choices",
    body: [
      "You can update parts of your profile from within the product. You can also contact us to ask about access, correction, or deletion requests, and we will review them in line with applicable law and the operational needs of the service.",
    ],
  },
  {
    title: "Contact",
    body: [
      "For privacy questions, requests, or concerns, contact us at privacy@trust50.com.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-10 text-foreground sm:py-14">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p>Privacy Policy</p>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/" className="font-medium transition hover:text-foreground">
              Back to Trust50
            </Link>
            <Link href="/how-it-works" className="font-medium transition hover:text-foreground">
              How circles work
            </Link>
          </div>
        </div>

        <section className="rounded-[28px] border border-line bg-white p-8 shadow-sm">
          <div className="space-y-4">
            <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
            <p className="max-w-3xl text-sm leading-7 text-muted">
              This policy explains what information Trust50 collects, how we use it, and how we
              handle it inside the product.
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Last updated May 12, 2026</p>
          </div>

          <div className="mt-8 space-y-8">
            {sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                <div className="space-y-3 text-sm leading-7 text-muted">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-line bg-panel px-4 py-4 text-sm leading-7 text-muted">
            This is a simple operating policy for the current product, not a jurisdiction-specific
            legal opinion. If Trust50 expands into heavier compliance or regulated workflows, this
            policy should be reviewed and updated.
          </div>
        </section>
      </div>
    </main>
  );
}
