"use client";

import Link from "next/link";
import { MembershipStatus } from "@prisma/client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import { AppTopNav } from "@/components/AppTopNav";

type AdminUserRow = {
  id: string;
  name: string | null;
  email: string;
  trustScoreCached: number;
  isAdmin: boolean;
  activeMemberships: number;
  pendingMemberships: number;
  createdAt: string;
};

type AdminCircleRow = {
  id: string;
  name: string;
  status: string;
  memberCount: number;
  pendingCount: number;
  trustDensityLabelCached: string;
  ownerName: string;
};

type AdminQueueRow = {
  id: string;
  createdAt: string;
  status: MembershipStatus;
  groupId: string;
  groupName: string;
  userId: string;
  userName: string;
  userEmail: string;
  fitWhy: string | null;
  contributionWhy: string | null;
  relevantContext: string | null;
};

type AdminPayload = {
  users: AdminUserRow[];
  circles: AdminCircleRow[];
  queue: AdminQueueRow[];
  trustSafety: {
    activeTrustLinks: number;
    reciprocalPairs: number;
    medianRoomTrust: number;
    riskLevel: "Low" | "Medium" | "High";
  };
  taxonomy: {
    domains: string[];
    proposals: {
      id: string;
      proposedBy: string;
      domain: string;
      reason: string;
      status: string;
      createdAt: string;
    }[];
  };
  audit: {
    id: string;
    actor: string;
    area: string;
    action: string;
    target: string;
    createdAt: string;
  }[];
};

type SectionId = "members" | "circles" | "queue" | "trust-safety" | "taxonomy" | "audit";

const sections: { id: SectionId; label: string }[] = [
  { id: "members", label: "Members" },
  { id: "circles", label: "Circles" },
  { id: "queue", label: "Applications Queue" },
  { id: "trust-safety", label: "Trust & Safety" },
  { id: "taxonomy", label: "Taxonomy Governance" },
  { id: "audit", label: "Audit Log" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function trustStatus(score: number) {
  if (score >= 151) return "Exceptional";
  if (score >= 101) return "Deeply trusted";
  if (score >= 51) return "Respected";
  if (score >= 21) return "Trusted";
  return "Building trust";
}

function queueStatusLabel(status: MembershipStatus) {
  if (status === MembershipStatus.pending) return "Pending";
  if (status === MembershipStatus.invited) return "Invited";
  return "Waitlist";
}

function useAdminData(enabled: boolean) {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const response = await fetch("/api/admin/overview", { cache: "no-store" });
        const payload = (await response.json()) as AdminPayload | { error?: string };
        if (!response.ok) throw new Error(("error" in payload && payload.error) || "Unable to load admin data.");
        setData(payload as AdminPayload);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load admin data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [enabled]);

  return { data, loading, error, setData };
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAdmin = Boolean(session?.user?.isAdmin) || session?.user?.id === "temp-user";
  const [activeSection, setActiveSection] = useState<SectionId>("members");
  const [actingId, setActingId] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [proposalDomain, setProposalDomain] = useState("");
  const [proposalReason, setProposalReason] = useState("");
  const [flash, setFlash] = useState<string | null>(null);
  const { data, loading, error, setData } = useAdminData(status === "authenticated" && isAdmin);

  const totals = useMemo(() => {
    return {
      users: data?.users.length ?? 0,
      circles: data?.circles.length ?? 0,
      queued: data?.queue.length ?? 0,
    };
  }, [data]);

  async function handleQueueAction(membershipId: string, action: "accept" | "reject") {
    setActingId(membershipId);
    setFlash(null);

    try {
      const response = await fetch(`/api/admin/memberships/${membershipId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to update application.");

      setData((current) =>
        current
          ? {
              ...current,
              queue: current.queue.filter((item) => item.id !== membershipId),
              circles: current.circles.map((circle) => {
                const target = current.queue.find((item) => item.id === membershipId);
                if (!target || target.groupId !== circle.id) return circle;
                if (action === "accept") {
                  return {
                    ...circle,
                    memberCount: circle.memberCount + 1,
                    pendingCount: Math.max(0, circle.pendingCount - 1),
                  };
                }
                return { ...circle, pendingCount: Math.max(0, circle.pendingCount - 1) };
              }),
              users: current.users.map((user) => {
                const target = current.queue.find((item) => item.id === membershipId);
                if (!target || target.userId !== user.id) return user;
                if (action === "accept") {
                  return {
                    ...user,
                    activeMemberships: user.activeMemberships + 1,
                    pendingMemberships: Math.max(0, user.pendingMemberships - 1),
                  };
                }
                return { ...user, pendingMemberships: Math.max(0, user.pendingMemberships - 1) };
              }),
            }
          : current,
      );

      setFlash(action === "accept" ? "Application accepted." : "Application rejected.");
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Unable to update application.");
    } finally {
      setActingId(null);
      router.refresh();
    }
  }

  async function handleCreateUser() {
    if (!newUserEmail.trim()) {
      setFlash("Email is required.");
      return;
    }
    setFlash(null);
    setActingId("create-user");
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newUserEmail.trim(), name: newUserName.trim() }),
      });
      const payload = (await response.json()) as { error?: string } & Partial<AdminUserRow>;
      if (!response.ok) throw new Error(payload.error || "Unable to create user.");

      setData((current) =>
        current
          ? {
              ...current,
              users: [
                {
                  id: String(payload.id),
                  email: String(payload.email),
                  name: (payload.name as string | null) ?? null,
                  trustScoreCached: Number(payload.trustScoreCached ?? 0),
                  isAdmin: Boolean(payload.isAdmin),
                  activeMemberships: 0,
                  pendingMemberships: 0,
                  createdAt: String(payload.createdAt),
                },
                ...current.users,
              ],
              audit: [
                {
                  id: `local-${Date.now()}`,
                  actor: session?.user?.name || session?.user?.email || "Admin",
                  area: "members",
                  action: "create_user",
                  target: `user:${String(payload.id)}`,
                  createdAt: new Date().toISOString(),
                },
                ...current.audit,
              ],
            }
          : current,
      );
      setNewUserEmail("");
      setNewUserName("");
      setFlash("User created.");
      router.refresh();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Unable to create user.");
    } finally {
      setActingId(null);
    }
  }

  async function handleDeleteUser(id: string) {
    setFlash(null);
    setActingId(id);
    try {
      const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to delete user.");

      setData((current) =>
        current
          ? {
              ...current,
              users: current.users.filter((user) => user.id !== id),
              audit: [
                {
                  id: `local-${Date.now()}`,
                  actor: session?.user?.name || session?.user?.email || "Admin",
                  area: "members",
                  action: "delete_user",
                  target: `user:${id}`,
                  createdAt: new Date().toISOString(),
                },
                ...current.audit,
              ],
            }
          : current,
      );

      setFlash("User deleted.");
      router.refresh();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Unable to delete user.");
    } finally {
      setActingId(null);
    }
  }

  async function handleProposalSubmit() {
    if (!proposalDomain.trim() || !proposalReason.trim()) {
      setFlash("Add both domain and reason.");
      return;
    }
    setFlash(null);
    try {
      const response = await fetch("/api/admin/taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: proposalDomain.trim(), reason: proposalReason.trim() }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to submit proposal.");
      setFlash("Domain proposal submitted.");
      setProposalDomain("");
      setProposalReason("");
      router.refresh();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Unable to submit proposal.");
    }
  }

  async function handleProposalReview(id: string, action: "approve" | "reject") {
    setActingId(id);
    setFlash(null);
    try {
      const response = await fetch(`/api/admin/taxonomy/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to review proposal.");
      setData((current) =>
        current
          ? {
              ...current,
              taxonomy: {
                ...current.taxonomy,
                proposals: current.taxonomy.proposals.map((proposal) =>
                  proposal.id === id ? { ...proposal, status: action === "approve" ? "approved" : "rejected" } : proposal,
                ),
              },
            }
          : current,
      );
      setFlash(action === "approve" ? "Proposal approved." : "Proposal rejected.");
      router.refresh();
    } catch (err) {
      setFlash(err instanceof Error ? err.message : "Unable to review proposal.");
    } finally {
      setActingId(null);
    }
  }

  if (status === "loading") {
    return <main className="min-h-screen bg-background px-6 py-10 text-foreground">Loading admin panel...</main>;
  }

  if (!session?.user?.id || !isAdmin) {
    return (
      <main className="min-h-screen bg-background px-6 py-10 text-foreground">
        <div className="mx-auto max-w-3xl rounded-3xl border border-line bg-white p-6 shadow-sm">
          <p className="text-base font-semibold">Admin access required.</p>
          <p className="mt-2 text-sm text-muted">This area is available only to Trust50 admins.</p>
          <Link href="/" className="mt-4 inline-flex rounded-full bg-foreground px-4 py-2 text-sm font-medium text-white">
            Back to Wire
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="mx-auto max-w-6xl">
        <AppTopNav currentUserId={session.user.id} />

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Admin Panel</h1>
          <span className="rounded-full border border-line bg-white px-3 py-1 text-xs font-medium text-muted">
            {totals.users} members / {totals.circles} circles / {totals.queued} queued
          </span>
        </div>

        {flash ? <div className="mb-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted shadow-sm">{flash}</div> : null}
        {error ? <div className="mb-4 rounded-2xl border border-line bg-white px-4 py-3 text-sm text-muted shadow-sm">{error}</div> : null}

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-3xl border border-line bg-white p-3 shadow-sm">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
                className={`mb-2 block w-full rounded-2xl px-4 py-3 text-left text-sm transition last:mb-0 ${
                  activeSection === section.id
                    ? "bg-foreground font-medium text-white"
                    : "text-muted hover:bg-panel hover:text-foreground"
                }`}
              >
                {section.label}
              </button>
            ))}
          </aside>

          <section className="space-y-4">
            {loading || !data ? (
              <div className="rounded-3xl border border-line bg-white p-6 shadow-sm">Loading…</div>
            ) : null}

            {!loading && data && activeSection === "members" ? (
              <div className="rounded-3xl border border-line bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Members</p>
                <div className="mb-4 grid gap-2 rounded-2xl border border-line bg-panel/50 p-3 sm:grid-cols-[1fr_1fr_auto]">
                  <input
                    value={newUserEmail}
                    onChange={(event) => setNewUserEmail(event.target.value)}
                    placeholder="Email"
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                  />
                  <input
                    value={newUserName}
                    onChange={(event) => setNewUserName(event.target.value)}
                    placeholder="Name (optional)"
                    className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => void handleCreateUser()}
                    disabled={actingId === "create-user"}
                    className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
                  >
                    Add user
                  </button>
                </div>
                <div className="space-y-3">
                  {data.users.map((user) => (
                    <div key={user.id} className="rounded-2xl border border-line bg-panel/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{user.name || user.email}</p>
                          <p className="text-sm text-muted">{user.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/members/${user.id}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-foreground">
                            View profile
                          </Link>
                          <button
                            type="button"
                            onClick={() => void handleDeleteUser(user.id)}
                            disabled={actingId === user.id || user.id === session.user.id}
                            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Trust: {Math.min(user.trustScoreCached, 200)}/200 ({trustStatus(user.trustScoreCached)}) / Active circles: {user.activeMemberships} / Queued: {user.pendingMemberships} / Joined: {formatDate(user.createdAt)}
                        {user.isAdmin ? " / Admin" : ""}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && data && activeSection === "circles" ? (
              <div className="rounded-3xl border border-line bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Circles</p>
                <div className="space-y-3">
                  {data.circles.map((circle) => (
                    <div key={circle.id} className="rounded-2xl border border-line bg-panel/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{circle.name}</p>
                          <p className="text-sm text-muted">Owner: {circle.ownerName}</p>
                        </div>
                        <div className="flex gap-2">
                          <Link href={`/groups/${circle.id}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-foreground">
                            Open
                          </Link>
                          <Link href={`/owner/groups/${circle.id}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-foreground">
                            Owner view
                          </Link>
                        </div>
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        Status: {circle.status} / {circle.memberCount}/50 members / {circle.pendingCount} queued / Trust density: {circle.trustDensityLabelCached}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && data && activeSection === "queue" ? (
              <div className="rounded-3xl border border-line bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Applications Queue</p>
                <div className="space-y-3">
                  {data.queue.length === 0 ? (
                    <div className="rounded-2xl border border-line bg-panel/50 p-4 text-sm text-muted">No queued applications right now.</div>
                  ) : null}

                  {data.queue.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-line bg-panel/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-foreground">{item.userName}</p>
                          <p className="text-sm text-muted">{item.userEmail}</p>
                          <p className="mt-1 text-xs text-muted">
                            {item.groupName} / {queueStatusLabel(item.status)} / Applied {formatDate(item.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() => void handleQueueAction(item.id, "accept")}
                            className="rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            disabled={actingId === item.id}
                            onClick={() => void handleQueueAction(item.id, "reject")}
                            className="rounded-full border border-line bg-white px-3 py-1.5 text-xs font-medium text-foreground disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2 text-xs text-muted sm:grid-cols-3">
                        <p><span className="font-medium text-foreground">Fit:</span> {item.fitWhy || "—"}</p>
                        <p><span className="font-medium text-foreground">Contribution:</span> {item.contributionWhy || "—"}</p>
                        <p><span className="font-medium text-foreground">Context:</span> {item.relevantContext || "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && data && activeSection === "trust-safety" ? (
              <div className="rounded-3xl border border-line bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Trust & Safety</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-2xl border border-line bg-panel/50 p-4">
                    <p className="text-xs text-muted">Active trust links</p>
                    <p className="mt-1 text-xl font-semibold">{data.trustSafety.activeTrustLinks}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-panel/50 p-4">
                    <p className="text-xs text-muted">Reciprocal pairs</p>
                    <p className="mt-1 text-xl font-semibold">{data.trustSafety.reciprocalPairs}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-panel/50 p-4">
                    <p className="text-xs text-muted">Median trust/circle</p>
                    <p className="mt-1 text-xl font-semibold">{data.trustSafety.medianRoomTrust}</p>
                  </div>
                  <div className="rounded-2xl border border-line bg-panel/50 p-4">
                    <p className="text-xs text-muted">Risk level</p>
                    <p className="mt-1 text-xl font-semibold">{data.trustSafety.riskLevel}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {!loading && data && activeSection === "taxonomy" ? (
              <div className="rounded-3xl border border-line bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Taxonomy Governance</p>
                <div className="mb-4 rounded-2xl border border-line bg-panel/50 p-4">
                  <p className="text-xs font-medium text-muted">Current domains</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {data.taxonomy.domains.map((domain) => (
                      <span key={domain} className="rounded-full border border-line bg-white px-3 py-1 text-xs text-foreground">{domain}</span>
                    ))}
                  </div>
                </div>
                <div className="mb-4 rounded-2xl border border-line bg-panel/50 p-4">
                  <p className="text-xs font-medium text-muted">Propose a new domain</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
                    <input
                      value={proposalDomain}
                      onChange={(event) => setProposalDomain(event.target.value)}
                      placeholder="Domain name"
                      className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                    />
                    <input
                      value={proposalReason}
                      onChange={(event) => setProposalReason(event.target.value)}
                      placeholder="Why trust changes quality here"
                      className="rounded-xl border border-line bg-white px-3 py-2 text-sm"
                    />
                    <button onClick={() => void handleProposalSubmit()} className="rounded-full bg-foreground px-4 py-2 text-xs font-medium text-white">
                      Propose
                    </button>
                  </div>
                </div>
                <div className="space-y-3">
                  {data.taxonomy.proposals.map((proposal) => (
                    <div key={proposal.id} className="rounded-2xl border border-line bg-panel/50 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{proposal.domain}</p>
                          <p className="text-xs text-muted">By {proposal.proposedBy} / {formatDate(proposal.createdAt)} / {proposal.status}</p>
                          <p className="mt-1 text-sm text-muted">{proposal.reason}</p>
                        </div>
                        {proposal.status === "proposed" ? (
                          <div className="flex gap-2">
                            <button disabled={actingId === proposal.id} onClick={() => void handleProposalReview(proposal.id, "approve")} className="rounded-full bg-foreground px-3 py-1.5 text-xs text-white disabled:opacity-50">Approve</button>
                            <button disabled={actingId === proposal.id} onClick={() => void handleProposalReview(proposal.id, "reject")} className="rounded-full border border-line bg-white px-3 py-1.5 text-xs text-foreground disabled:opacity-50">Reject</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {!loading && data && activeSection === "audit" ? (
              <div className="rounded-3xl border border-line bg-white p-4 shadow-sm">
                <p className="mb-3 text-sm font-semibold">Audit Log</p>
                <div className="space-y-3">
                  {data.audit.length === 0 ? (
                    <div className="rounded-2xl border border-line bg-panel/50 p-4 text-sm text-muted">No admin actions logged yet.</div>
                  ) : null}
                  {data.audit.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-line bg-panel/50 p-4">
                      <p className="font-medium text-foreground">{item.actor}</p>
                      <p className="mt-1 text-sm text-muted">
                        {item.action} / {item.area} / {item.target || "—"} / {formatDate(item.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
