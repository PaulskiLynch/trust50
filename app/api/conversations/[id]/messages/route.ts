import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getConversationForUser } from "@/lib/conversations";
import { safeUserSelect } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

const createMessageSchema = z.object({
  body: z.string().trim().min(1, "Message cannot be empty"),
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

    const { id } = await context.params;
    const conversation = await getConversationForUser(id, session.user.id);

    if (!conversation) {
      return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
    }

    const payload = createMessageSchema.parse(await req.json());

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: session.user.id,
        body: payload.body,
      },
      include: {
        sender: {
          select: safeUserSelect,
        },
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to send message" }, { status: 500 });
  }
}
