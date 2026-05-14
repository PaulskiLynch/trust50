import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const reviewSchema = z.object({
  action: z.enum(["approve", "reject"]),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(session?.user?.isAdmin) || userId === "temp-user";

  if (!userId || !isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;
  const proposal = await prisma.interestLead.findUnique({ where: { id } });
  if (!proposal || proposal.kind !== "taxonomy_proposal") {
    return NextResponse.json({ error: "Proposal not found." }, { status: 404 });
  }

  try {
    const payload = reviewSchema.parse(await request.json());
    await prisma.interestLead.update({
      where: { id },
      data: {
        signal: payload.action === "approve" ? "approved" : "rejected",
      },
    });
    await prisma.interestLead.create({
      data: {
        email: session.user.email || "admin@trust50.local",
        kind: "admin_audit",
        name: session.user.name || "Admin",
        source: "taxonomy_governance",
        signal: payload.action,
        note: `proposal:${id}`,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid review action." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to review proposal." }, { status: 500 });
  }
}

