import { NextResponse } from "next/server";
import { TrustLinkStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { refreshRoomTrustDensityCache, refreshUserTrustCache } from "@/lib/trust";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  const softDecayCandidates = await prisma.trustLink.findMany({
    where: {
      status: TrustLinkStatus.active,
      updatedAt: {
        lt: ninetyDaysAgo,
      },
    },
    select: {
      id: true,
      receiverUserId: true,
      roomId: true,
    },
  });

  const expiryCandidates = await prisma.trustLink.findMany({
    where: {
      status: TrustLinkStatus.soft_decayed,
      softDecayedAt: {
        lt: ninetyDaysAgo,
      },
    },
    select: {
      id: true,
      receiverUserId: true,
      roomId: true,
    },
  });

  await prisma.$transaction(async (tx) => {
    if (softDecayCandidates.length) {
      await tx.trustLink.updateMany({
        where: {
          id: {
            in: softDecayCandidates.map((link) => link.id),
          },
        },
        data: {
          status: TrustLinkStatus.soft_decayed,
          softDecayedAt: now,
        },
      });
    }

    if (expiryCandidates.length) {
      await tx.trustLink.updateMany({
        where: {
          id: {
            in: expiryCandidates.map((link) => link.id),
          },
        },
        data: {
          status: TrustLinkStatus.expired,
          expiredAt: now,
        },
      });
    }

    const affectedUserIds = new Set([
      ...softDecayCandidates.map((link) => link.receiverUserId),
      ...expiryCandidates.map((link) => link.receiverUserId),
    ]);
    const affectedRoomIds = new Set([
      ...softDecayCandidates.map((link) => link.roomId),
      ...expiryCandidates.map((link) => link.roomId),
    ]);

    for (const userId of affectedUserIds) {
      await refreshUserTrustCache(tx, userId);
    }

    for (const roomId of affectedRoomIds) {
      await refreshRoomTrustDensityCache(tx, roomId);
    }
  });

  return NextResponse.json({
    softDecayed: softDecayCandidates.length,
    expired: expiryCandidates.length,
  });
}
