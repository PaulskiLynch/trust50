import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { ensureConversationForGroupMembers, getConversationsForUser } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";

const createConversationSchema = z.object({
  groupId: z.string().trim().min(1, "Group is required"),
  targetUserId: z.string().trim().min(1, "Target user is required"),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = createConversationSchema.parse(await req.json());
    const conversation = await ensureConversationForGroupMembers(
      prisma,
      payload.groupId,
      session.user.id,
      payload.targetUserId,
    );

    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to create conversation" }, { status: 500 });
  }
}

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  return NextResponse.json(await getConversationsForUser(session.user.id));
}
