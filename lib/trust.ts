import { MembershipStatus, Prisma, PrismaClient, TrustLinkStatus } from "@prisma/client";

export const MAX_TRUST_SCORE = 200;

export const TRUST_TIERS = [
  { min: 0, max: 20, label: "Earning Trust" },
  { min: 21, max: 50, label: "Trusted" },
  { min: 51, max: 100, label: "Respected" },
  { min: 101, max: 150, label: "Deeply Trusted" },
  { min: 151, max: 199, label: "Exceptional" },
  { min: 200, max: 200, label: "Mythical Unicorn" },
] as const;

export const TRUST_UNLOCKS = [
  { min: 0, action: "join_by_invite" },
  { min: 25, action: "vouch_for_others" },
  { min: 75, action: "create_free_room" },
  { min: 125, action: "apply_to_curate_paid_room" },
] as const;

export function getTrustLevel(score: number) {
  if (score >= 200) return "Mythical Unicorn";
  if (score >= 151) return "Exceptional";
  if (score >= 101) return "Deeply Trusted";
  if (score >= 51) return "Respected";
  if (score >= 21) return "Trusted";
  return "Earning Trust";
}

export function getRoomTrustDensityLabel(percent: number) {
  if (percent >= 71) return "Exceptional";
  if (percent >= 46) return "Strong";
  if (percent >= 26) return "Healthy";
  if (percent >= 11) return "Emerging";
  return "Forming";
}

export function canVouch(trustScore: number) {
  return trustScore >= 25;
}

export function canCreateFreeRoom(trustScore: number) {
  return trustScore >= 75;
}

export function canApplyToCuratePaidRoom(trustScore: number) {
  return trustScore >= 125;
}

type TrustDb = Prisma.TransactionClient | PrismaClient;

export async function calculateUserTrustScore(db: TrustDb, userId: string) {
  const trustScore = await db.trustLink.count({
    where: {
      receiverUserId: userId,
      status: TrustLinkStatus.active,
    },
  });

  return Math.min(trustScore, MAX_TRUST_SCORE);
}

export async function refreshUserTrustCache(db: TrustDb, userId: string) {
  const score = await calculateUserTrustScore(db, userId);

  return db.user.update({
    where: { id: userId },
    data: {
      trustScoreCached: score,
      trustLevelCached: getTrustLevel(score),
    },
  });
}

export async function calculateRoomTrustDensity(db: TrustDb, roomId: string) {
  const memberCount = await db.membership.count({
    where: {
      groupId: roomId,
      status: MembershipStatus.active,
    },
  });
  const maxPossibleLinks = memberCount * (memberCount - 1);

  if (!maxPossibleLinks) return 0;

  const activeLinks = await db.trustLink.count({
    where: {
      roomId,
      status: TrustLinkStatus.active,
    },
  });

  return (activeLinks / maxPossibleLinks) * 100;
}

export async function refreshRoomTrustDensityCache(db: TrustDb, roomId: string) {
  const density = await calculateRoomTrustDensity(db, roomId);

  return db.group.update({
    where: { id: roomId },
    data: {
      trustDensityCached: new Prisma.Decimal(density),
      trustDensityLabelCached: getRoomTrustDensityLabel(density),
    },
  });
}

export async function refreshActiveRoomCountCache(db: TrustDb, userId: string) {
  const activeRoomCount = await db.membership.count({
    where: {
      userId,
      status: MembershipStatus.active,
      role: {
        not: "owner",
      },
    },
  });

  return db.user.update({
    where: { id: userId },
    data: { activeRoomCount },
  });
}

export async function assertTrustEligibility(
  db: TrustDb,
  giverUserId: string,
  receiverUserId: string,
  roomId: string,
) {
  if (giverUserId === receiverUserId) {
    throw new Error("You cannot trust yourself.");
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [giverMembership, receiverMembership, contributionCount] = await Promise.all([
    db.membership.findUnique({
      where: { userId_groupId: { userId: giverUserId, groupId: roomId } },
    }),
    db.membership.findUnique({
      where: { userId_groupId: { userId: receiverUserId, groupId: roomId } },
    }),
    db.request.count({
      where: {
        groupId: roomId,
        OR: [
          { creatorId: receiverUserId },
          { replies: { some: { senderId: receiverUserId } } },
          { introductions: { some: { connectorId: receiverUserId } } },
        ],
      },
    }),
  ]);

  if (giverMembership?.status !== MembershipStatus.active || receiverMembership?.status !== MembershipStatus.active) {
    throw new Error("Trust requires both members to be active in the same room.");
  }

  if (giverMembership.createdAt > sevenDaysAgo || receiverMembership.createdAt > sevenDaysAgo) {
    throw new Error("Trust unlocks after 7 days of shared room membership.");
  }

  if (contributionCount < 1) {
    throw new Error("Trust requires a meaningful contribution first.");
  }
}
