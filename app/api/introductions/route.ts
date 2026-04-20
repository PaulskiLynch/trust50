import { NextResponse } from "next/server";
import { MembershipStatus, RequestStatus } from "@prisma/client";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createIntroductionSchema = z.object({
  requestId: z.string().min(1, "Request is required"),
  targetUserId: z.string().min(1, "Target user is required"),
  note: z.string().optional().default(""),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = createIntroductionSchema.parse(await req.json());

    const requestRecord = await prisma.request.findUnique({
      where: {
        id: payload.requestId,
      },
      include: {
        group: true,
      },
    });

    if (!requestRecord) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }

    if (requestRecord.status !== RequestStatus.open) {
      return NextResponse.json({ error: "Request is no longer open" }, { status: 400 });
    }

    if (requestRecord.creatorId === session.user.id) {
      return NextResponse.json(
        { error: "Request creators cannot offer introductions on their own request" },
        { status: 400 },
      );
    }

    const connectorMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: requestRecord.groupId,
        },
      },
    });

    if (!connectorMembership || connectorMembership.status !== "active") {
      return NextResponse.json(
        { error: "Only active group members can offer introductions" },
        { status: 403 },
      );
    }

    const targetMembership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: payload.targetUserId,
          groupId: requestRecord.groupId,
        },
      },
    });

    if (!targetMembership || targetMembership.status !== MembershipStatus.active) {
      return NextResponse.json(
        { error: "Target user must be an active member of the group" },
        { status: 400 },
      );
    }

    const existingIntroduction = await prisma.introduction.findFirst({
      where: {
        requestId: payload.requestId,
        connectorId: session.user.id,
        targetUserId: payload.targetUserId,
      },
    });

    if (existingIntroduction) {
      return NextResponse.json(
        { error: "You already offered this introduction" },
        { status: 400 },
      );
    }

    const introduction = await prisma.introduction.create({
      data: {
        requestId: payload.requestId,
        connectorId: session.user.id,
        targetUserId: payload.targetUserId,
        note: payload.note || null,
        status: "pending",
      },
    });

    return NextResponse.json(introduction, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to create introduction" }, { status: 500 });
  }
}
