import { NextResponse } from "next/server";
import { TrustLinkStatus } from "@prisma/client";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getGroupById } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { assertTrustEligibility, refreshRoomTrustDensityCache, refreshUserTrustCache } from "@/lib/trust";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const trustSchema = z.object({
  receiverUserId: z.string().min(1),
});

async function parsePayload(req: Request) {
  try {
    return trustSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(error.issues[0]?.message || "Invalid trust action.");
    }

    throw new Error("Invalid trust action.");
  }
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { id } = await context.params;
  const group = await getGroupById(id, session.user.id);

  if (!group) {
    return NextResponse.json({ error: "Room not found" }, { status: 404 });
  }

  let payload: z.infer<typeof trustSchema>;

  try {
    payload = await parsePayload(req);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid trust action." }, { status: 400 });
  }

  try {
    await assertTrustEligibility(prisma, session.user.id, payload.receiverUserId, id);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Trust is not available yet." }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.trustLink.findFirst({
      where: {
        giverUserId: session.user.id,
        receiverUserId: payload.receiverUserId,
        roomId: id,
        status: {
          in: [TrustLinkStatus.active, TrustLinkStatus.soft_decayed],
        },
      },
    });

    const trustLink =
      existing?.status === TrustLinkStatus.active
        ? existing
        : existing
          ? await tx.trustLink.update({
              where: { id: existing.id },
              data: {
                status: TrustLinkStatus.active,
                softDecayedAt: null,
                expiredAt: null,
                revokedAt: null,
              },
            })
          : await tx.trustLink.create({
              data: {
                giverUserId: session.user.id,
                receiverUserId: payload.receiverUserId,
                roomId: id,
                status: TrustLinkStatus.active,
              },
            });

    const receiver = await refreshUserTrustCache(tx, payload.receiverUserId);
    const room = await refreshRoomTrustDensityCache(tx, id);

    return {
      trustLink,
      trustedByCount: receiver.trustScoreCached,
      trustLevel: receiver.trustLevelCached,
      roomTrustDensity: Number(room.trustDensityCached),
      roomTrustDensityLabel: room.trustDensityLabelCached,
    };
  });

  return NextResponse.json(result);
}

export async function DELETE(req: Request, context: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { id } = await context.params;
  let payload: z.infer<typeof trustSchema>;

  try {
    payload = await parsePayload(req);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid trust action." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.trustLink.updateMany({
      where: {
        giverUserId: session.user.id,
        receiverUserId: payload.receiverUserId,
        roomId: id,
        status: TrustLinkStatus.active,
      },
      data: {
        status: TrustLinkStatus.revoked,
        revokedAt: new Date(),
      },
    });

    const receiver = await refreshUserTrustCache(tx, payload.receiverUserId);
    const room = await refreshRoomTrustDensityCache(tx, id);

    return {
      trustedByCount: receiver.trustScoreCached,
      trustLevel: receiver.trustLevelCached,
      roomTrustDensity: Number(room.trustDensityCached),
      roomTrustDensityLabel: room.trustDensityLabelCached,
    };
  });

  return NextResponse.json(result);
}
