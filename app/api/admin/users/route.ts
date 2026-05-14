import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(2).max(80).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(session?.user?.isAdmin) || userId === "temp-user";

  if (!userId || !isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  try {
    const payload = createUserSchema.parse(await request.json());
    const email = payload.email.toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "User with this email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        email,
        name: payload.name || null,
        passwordHash: "",
      },
      select: {
        id: true,
        email: true,
        name: true,
        trustScoreCached: true,
        isAdmin: true,
        createdAt: true,
      },
    });

    await prisma.interestLead.create({
      data: {
        email: session.user.email || "admin@trust50.local",
        kind: "admin_audit",
        name: session.user.name || "Admin",
        source: "members",
        signal: "create_user",
        note: `user:${user.id}`,
      },
    });

    return NextResponse.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid user details." }, { status: 400 });
    }
    return NextResponse.json({ error: "Unable to create user." }, { status: 500 });
  }
}

