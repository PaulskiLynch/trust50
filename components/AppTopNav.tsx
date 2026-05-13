import Link from "next/link";

type AppTopNavProps = {
  activeTab?: "feed" | "circles" | "me";
  currentUserId?: string | null;
};

function FeedIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5A3.5 3.5 0 0 1 15.5 15H11l-5 4v-4.3A3.5 3.5 0 0 1 5 12V6.5Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 11h4" strokeLinecap="round" />
    </svg>
  );
}

function CirclesIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M4 10.5 12 4l8 6.5V20H4v-9.5Z" strokeLinejoin="round" />
      <path d="M9 20v-6h6v6" strokeLinejoin="round" />
    </svg>
  );
}

function MeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M4.5 21a7.5 7.5 0 0 1 15 0" strokeLinecap="round" />
    </svg>
  );
}

function OutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M10 5H6.5A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19H10" strokeLinecap="round" />
      <path d="M14 8l4 4-4 4M18 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function navItemClasses(active: boolean) {
  return `flex min-w-14 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-xs transition ${
    active ? "bg-panel font-semibold text-foreground" : "font-medium text-muted hover:bg-panel hover:text-foreground"
  }`;
}

export function AppTopNav({ activeTab, currentUserId }: AppTopNavProps) {
  return (
    <header className="mb-5 flex items-center justify-between gap-3">
      <Link href="/" aria-label="Trust50 home" className="shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/trust50-logo.png" alt="Trust50" className="h-20 w-20 rounded-3xl object-contain sm:h-16 sm:w-16" />
      </Link>

      <nav className="flex items-end gap-1 sm:gap-3">
        <Link href="/" className={navItemClasses(activeTab === "feed")}>
          <FeedIcon />
          <span>Feed</span>
        </Link>
        <Link href="/explore-groups" className={navItemClasses(activeTab === "circles")}>
          <CirclesIcon />
          <span>Circles</span>
        </Link>
        {currentUserId ? (
          <>
            <Link href={`/members/${currentUserId}`} className={navItemClasses(activeTab === "me")}>
              <MeIcon />
              <span>Me</span>
            </Link>
            <Link href="/api/auth/signout?callbackUrl=/" className={navItemClasses(false)}>
              <OutIcon />
              <span>Out</span>
            </Link>
          </>
        ) : null}
      </nav>
    </header>
  );
}
