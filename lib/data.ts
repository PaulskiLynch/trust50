import { GroupStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getVisibleGroupWhereClause, groupWithRelations } from "@/lib/groups";

export async function getGroupsWithRelations(userId?: string | null) {
  return prisma.group.findMany({
    ...groupWithRelations,
    where: getVisibleGroupWhereClause(userId),
    orderBy: [
      {
        status: "desc",
      },
      {
        memberCount: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });
}

export async function getGroupById(groupId: string, userId?: string | null) {
  return prisma.group.findFirst({
    ...groupWithRelations,
    where: {
      id: groupId,
      ...getVisibleGroupWhereClause(userId),
    },
  });
}

export async function getDiscoveryGroups(userId?: string | null) {
  const groups = await getGroupsWithRelations(userId);

  return {
    activeGroups: groups.filter((group) => group.status === GroupStatus.active),
    formingGroups: groups.filter((group) => group.status === GroupStatus.emerging),
    draftGroups: groups.filter((group) => group.status === GroupStatus.draft),
  };
}

export async function getDemoUsers() {
  return prisma.user.findMany({
    orderBy: {
      createdAt: "asc",
    },
  });
}
