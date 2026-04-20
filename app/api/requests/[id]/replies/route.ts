import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createReplySchema = z.object({
  body: z.string().min(1, "Reply is required"),
  signal: z.string().max(40).optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(req: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = createReplySchema.parse(await req.json());
    const { id } = await context.params;

    const discussion = await prisma.request.findUnique({
      where: { id },
      select: { id: true, groupId: true },
    });

    if (!discussion) {
      return NextResponse.json({ error: "Discussion not found" }, { status: 404 });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: discussion.groupId,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.active) {
      return NextResponse.json({ error: "Only active members can reply here" }, { status: 403 });
    }

    const reply = await prisma.reply.create({
      data: {
        requestId: discussion.id,
        senderId: session.user.id,
        body: payload.body,
        signal: payload.signal || null,
      },
      include: {
        sender: true,
      },
    });

    return NextResponse.json(reply, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to create reply" }, { status: 500 });
  }
}
