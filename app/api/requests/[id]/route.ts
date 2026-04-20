import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const updateRequestSchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
  outcome: z.string().trim().max(140).optional().nullable(),
  outcomeType: z
    .enum([
      "decision_made",
      "hire_completed",
      "introduced_to_someone",
      "direction_clarified",
      "no_longer_pursuing",
    ])
    .optional()
    .nullable(),
  helpfulSource: z.string().trim().max(140).optional().nullable(),
  pinned: z.boolean().optional(),
});

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { id } = await context.params;

  const requestRecord = await prisma.request.findUnique({
    where: { id },
    include: {
      creator: true,
      group: {
        include: {
          owner: true,
          memberships: {
            include: { user: true },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      replies: {
        include: { sender: true },
        orderBy: { createdAt: "asc" },
      },
      introductions: {
        include: {
          connector: true,
          targetUser: true,
          conversation: {
            select: {
              id: true,
              participantOneId: true,
              participantTwoId: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!requestRecord) {
    return NextResponse.json({ error: "Request not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId: requestRecord.groupId,
      },
    },
  });

  if (!membership && !session.user.isAdmin) {
    return NextResponse.json({ error: "Not authorized for this discussion" }, { status: 403 });
  }

  return NextResponse.json(requestRecord);
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = updateRequestSchema.parse(await req.json());
    const { id } = await context.params;

    const requestRecord = await prisma.request.findUnique({
      where: {
        id,
      },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: requestRecord.groupId,
        },
      },
    });

    const canModerate = membership?.role === "owner" || session.user.isAdmin;

    if (requestRecord.creatorId !== session.user.id && !canModerate) {
      return NextResponse.json(
        { error: "Only the discussion creator or group owner can update this discussion" },
        { status: 403 },
      );
    }

    const updatedRequest = await prisma.request.update({
      where: {
        id,
      },
      data: {
        ...(payload.status ? { status: payload.status } : {}),
        ...(payload.outcome !== undefined ? { outcome: payload.outcome || null } : {}),
        ...(payload.outcomeType !== undefined ? { outcomeType: payload.outcomeType || null } : {}),
        ...(payload.helpfulSource !== undefined ? { helpfulSource: payload.helpfulSource || null } : {}),
        ...(payload.status === "closed" ? { resolvedAt: new Date() } : {}),
        ...(payload.status === "open" ? { resolvedAt: null } : {}),
        ...(payload.pinned !== undefined && canModerate ? { pinned: payload.pinned } : {}),
      },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to update request" }, { status: 500 });
  }
}
