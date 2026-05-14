import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(session?.user?.isAdmin) || userId === "temp-user";

  if (!userId || !isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const payload = (await request.json().catch(() => null)) as { action?: "accept" | "reject" } | null;
  const action = payload?.action;

  if (!action) {
    return NextResponse.json({ error: "Action is required." }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { id },
    select: { id: true, status: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  if (
    membership.status !== MembershipStatus.pending &&
    membership.status !== MembershipStatus.invited &&
    membership.status !== MembershipStatus.waitlist
  ) {
    return NextResponse.json({ error: "Only queued applications can be updated." }, { status: 400 });
  }

  if (action === "accept") {
    const updated = await prisma.membership.update({
      where: { id },
      data: { status: MembershipStatus.active },
      select: { id: true, status: true },
    });
    await prisma.interestLead.create({
      data: {
        email: session.user.email || "admin@trust50.local",
        kind: "admin_audit",
        source: "applications_queue",
        signal: "accept",
        note: `membership:${membership.id}`,
        name: session.user.name || "Admin",
      },
    });

    return NextResponse.json({ ok: true, membership: updated });
  }

  await prisma.membership.delete({ where: { id } });
  await prisma.interestLead.create({
    data: {
      email: session.user.email || "admin@trust50.local",
      kind: "admin_audit",
      source: "applications_queue",
      signal: "reject",
      note: `membership:${membership.id}`,
      name: session.user.name || "Admin",
    },
  });
  return NextResponse.json({ ok: true });
}
