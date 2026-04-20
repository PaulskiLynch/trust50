import { GroupStatus, MembershipStatus, Prisma, PrismaClient } from "@prisma/client";

export const MAX_MEMBER_GROUPS = 4;

export const publicUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  avatarUrl: true,
  headline: true,
  linkedinUrl: true,
  createdAt: true,
});

export const safeUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  headline: true,
  linkedinUrl: true,
  createdAt: true,
});

export const publicDiscoveryGroup = Prisma.validator<Prisma.GroupDefaultArgs>()({
  include: {
    owner: {
      select: publicUserSelect,
    },
    memberships: {
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  },
});

export const groupWithRelations = Prisma.validator<Prisma.GroupDefaultArgs>()({
  include: {
    owner: {
      select: safeUserSelect,
    },
    memberships: {
      include: {
        user: {
          select: safeUserSelect,
        },
        recommendedBy: {
          select: safeUserSelect,
        },
        votes: {
          include: {
            voter: {
              select: safeUserSelect,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    },
    requests: {
      include: {
        creator: {
          select: safeUserSelect,
        },
        replies: {
          include: {
            sender: {
              select: safeUserSelect,
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        introductions: {
          include: {
            connector: {
              select: safeUserSelect,
            },
            targetUser: {
              select: safeUserSelect,
            },
            conversation: {
              select: {
                id: true,
                participantOneId: true,
                participantTwoId: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    },
  },
});

export type GroupWithRelations = Prisma.GroupGetPayload<typeof groupWithRelations>;
export type PublicDiscoveryGroup = Prisma.GroupGetPayload<typeof publicDiscoveryGroup>;

export function getGroupStatusFromMemberCount(memberCount: number): GroupStatus {
  if (memberCount >= 10) {
    return GroupStatus.active;
  }

  if (memberCount >= 5) {
    return GroupStatus.emerging;
  }

  return GroupStatus.draft;
}

export async function syncGroupLifecycle(
  db: PrismaClient | Prisma.TransactionClient,
  groupId: string,
) {
  const memberCount = await db.membership.count({
    where: {
      groupId,
      status: MembershipStatus.active,
    },
  });

  const nextStatus = getGroupStatusFromMemberCount(memberCount);
  const existingGroup = await db.group.findUnique({
    where: {
      id: groupId,
    },
    select: {
      publishedAt: true,
      status: true,
    },
  });

  return db.group.update({
    where: {
      id: groupId,
    },
    data: {
      memberCount,
      status: nextStatus,
      publishedAt:
        nextStatus === GroupStatus.active
          ? existingGroup?.publishedAt ?? new Date()
          : existingGroup?.publishedAt ?? null,
    },
  });
}

export function getVisibleGroupWhereClause(userId?: string | null): Prisma.GroupWhereInput {
  if (!userId) {
    return {
      status: {
        in: [GroupStatus.active, GroupStatus.emerging],
      },
    };
  }

  return {
    OR: [
      {
        status: {
          in: [GroupStatus.active, GroupStatus.emerging],
        },
      },
      {
        status: GroupStatus.draft,
        ownerId: userId,
      },
      {
        status: GroupStatus.draft,
        memberships: {
          some: {
            userId,
          },
        },
      },
    ],
  };
}

export async function countActiveNonOwnerMemberships(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  return db.membership.count({
    where: {
      userId,
      status: MembershipStatus.active,
      role: {
        not: "owner",
      },
    },
  });
}

export async function getGroupCapacityEligibility(
  db: PrismaClient | Prisma.TransactionClient,
  userId: string,
) {
  const activeGroupCount = await countActiveNonOwnerMemberships(db, userId);

  return {
    activeGroupCount,
    maxGroups: MAX_MEMBER_GROUPS,
    eligible: activeGroupCount < MAX_MEMBER_GROUPS,
    remainingSlots: Math.max(0, MAX_MEMBER_GROUPS - activeGroupCount),
  };
}

export function getMembershipVoteThreshold(activeMemberCount: number) {
  return Math.max(1, Math.ceil(activeMemberCount * 0.2));
}
