import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const proposalSchema = z.object({
  domain: z.string().trim().min(2).max(80),
  reason: z.string().trim().min(6).max(240),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;

  if (!userId) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  try {
    const payload = proposalSchema.parse(await request.json());
    await prisma.interestLead.create({
      data: {
        email: session.user.email || "member@trust50.local",
        kind: "taxonomy_proposal",
        name: session.user.name || "Member",
        source: payload.domain,
        signal: "proposed",
        note: payload.reason,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid proposal." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to submit proposal." }, { status: 500 });
  }
}

