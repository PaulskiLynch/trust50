import { DiscussionKind, MembershipStatus, RequestStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createRequestSchema = z.object({
  groupId: z.string().min(1, "Group is required"),
  title: z.string().min(1, "Discussion title is required"),
  content: z.string().min(1, "Request content is required"),
  kind: z.nativeEnum(DiscussionKind).optional().default(DiscussionKind.request),
});

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = createRequestSchema.parse(await req.json());

    const membership = await prisma.membership.findUnique({
      where: {
        userId_groupId: {
          userId: session.user.id,
          groupId: payload.groupId,
        },
      },
    });

    if (!membership || membership.status !== MembershipStatus.active) {
      return NextResponse.json(
        { error: "Only active members can create requests in a group" },
        { status: 403 },
      );
    }

    const requestRecord = await prisma.request.create({
      data: {
        content: payload.content,
        title: payload.title,
        kind: payload.kind,
        creatorId: session.user.id,
        groupId: payload.groupId,
        status: RequestStatus.open,
      },
    });

    return NextResponse.json(requestRecord, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to create request" }, { status: 500 });
  }
}
