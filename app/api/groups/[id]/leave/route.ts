import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncGroupLifecycle } from "@/lib/groups";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const leaveSchema = z.object({
  gotWhatNeeded: z.enum(["yes", "partly", "not-yet"]).optional(),
  leavingReason: z.string().trim().max(600).optional(),
  suggestedReplacement: z.string().trim().max(200).optional(),
});

export async function POST(req: Request, context: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { id: groupId } = await context.params;
  const payload = leaveSchema.safeParse(await req.json().catch(() => ({})));

  if (!payload.success) {
    return NextResponse.json({ error: "Unable to process leave request" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      },
    },
    include: {
      group: {
        select: {
          id: true,
          name: true,
          ownerId: true,
        },
      },
      user: {
        select: {
          email: true,
          name: true,
        },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not in this room." }, { status: 404 });
  }

  if (membership.role === "owner" || membership.group.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "Curators should step down through the room's leadership process instead of leaving directly." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.membershipVote.deleteMany({
      where: {
        membershipId: membership.id,
      },
    });

    await tx.membership.delete({
      where: {
        id: membership.id,
      },
    });

    await tx.interestLead.create({
      data: {
        email: membership.user.email,
        name: membership.user.name,
        kind: "room-exit",
        source: membership.group.name,
        signal: payload.data.gotWhatNeeded ?? membership.status,
        note: [
          `groupId=${membership.group.id}`,
          `membershipStatus=${membership.status}`,
          payload.data.leavingReason ? `reason=${payload.data.leavingReason}` : null,
          payload.data.suggestedReplacement ? `replacement=${payload.data.suggestedReplacement}` : null,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });

    if (membership.status === MembershipStatus.active) {
      await syncGroupLifecycle(tx, groupId);
    }
  });

  return NextResponse.json({
    ok: true,
    message:
      membership.status === MembershipStatus.active
        ? "You left the room and freed up one of your four slots."
        : "You withdrew from this room.",
  });
}
