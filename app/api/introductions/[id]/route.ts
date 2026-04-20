import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { ensureConversationForIntroduction } from "@/lib/conversations";
import { prisma } from "@/lib/prisma";

const updateIntroductionSchema = z.object({
  status: z.enum(["accepted", "declined"]),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = updateIntroductionSchema.parse(await req.json());
    const { id } = await context.params;

    const introduction = await prisma.introduction.findUnique({
      where: {
        id,
      },
    });

    if (!introduction) {
      return NextResponse.json({ error: "Introduction not found" }, { status: 404 });
    }

    const requestRecord = await prisma.request.findUnique({
      where: {
        id: introduction.requestId,
      },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (introduction.targetUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the target user can accept or decline this introduction" },
        { status: 403 },
      );
    }

    const updatedIntroduction = await prisma.$transaction(async (tx) => {
      const nextIntroduction = await tx.introduction.update({
        where: {
          id,
        },
        data: {
          status: payload.status,
          acceptedAt: payload.status === "accepted" ? new Date() : null,
        },
      });

      if (payload.status === "accepted") {
        await ensureConversationForIntroduction(tx, id);
      }

      return nextIntroduction;
    });

    return NextResponse.json(updatedIntroduction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to update introduction" }, { status: 500 });
  }
}
