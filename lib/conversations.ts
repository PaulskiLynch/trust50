import {
  ConversationKind,
  IntroductionStatus,
  MembershipStatus,
  Prisma,
  PrismaClient,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";

export const conversationWithRelations = Prisma.validator<Prisma.ConversationDefaultArgs>()({
  include: {
    participantOne: true,
    participantTwo: true,
    group: true,
    introduction: {
      include: {
        request: {
          include: {
            group: true,
            creator: true,
          },
        },
        connector: true,
        targetUser: true,
      },
    },
    messages: {
      include: {
        sender: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    },
  },
});

export type ConversationWithRelations = Prisma.ConversationGetPayload<
  typeof conversationWithRelations
>;

export async function ensureConversationForIntroduction(
  db: PrismaClient | Prisma.TransactionClient,
  introductionId: string,
) {
  const introduction = await db.introduction.findUnique({
    where: {
      id: introductionId,
    },
    include: {
      request: true,
      conversation: true,
    },
  });

  if (!introduction) {
    throw new Error("Introduction not found");
  }

  if (introduction.status !== IntroductionStatus.accepted) {
    throw new Error("Conversation can only be created for accepted introductions");
  }

  if (introduction.conversation) {
    return introduction.conversation;
  }

  return db.conversation.create({
    data: {
      introId: introduction.id,
      groupId: introduction.request.groupId,
      kind: ConversationKind.introduction,
      participantOneId: introduction.request.creatorId,
      participantTwoId: introduction.targetUserId,
    },
  });
}

function getDirectConversationKey(groupId: string, firstUserId: string, secondUserId: string) {
  const [left, right] = [firstUserId, secondUserId].sort();
  return `${groupId}:${left}:${right}`;
}

export async function ensureConversationForGroupMembers(
  db: PrismaClient | Prisma.TransactionClient,
  groupId: string,
  firstUserId: string,
  secondUserId: string,
) {
  if (firstUserId === secondUserId) {
    throw new Error("You cannot message yourself");
  }

  const memberships = await db.membership.findMany({
    where: {
      groupId,
      userId: {
        in: [firstUserId, secondUserId],
      },
      status: MembershipStatus.active,
    },
    select: {
      userId: true,
    },
  });

  if (memberships.length !== 2) {
    throw new Error("Both users must be active members of this group");
  }

  const directKey = getDirectConversationKey(groupId, firstUserId, secondUserId);
  const existing = await db.conversation.findFirst({
    where: {
      directKey,
    },
  });

  if (existing) {
    return existing;
  }

  return db.conversation.create({
    data: {
      groupId,
      kind: ConversationKind.direct,
      directKey,
      participantOneId: firstUserId,
      participantTwoId: secondUserId,
    },
  });
}

export async function getConversationForUser(conversationId: string, userId: string) {
  return prisma.conversation.findFirst({
    ...conversationWithRelations,
    where: {
      id: conversationId,
      OR: [{ participantOneId: userId }, { participantTwoId: userId }],
    },
  });
}

export async function getConversationsForUser(userId: string) {
  return prisma.conversation.findMany({
    ...conversationWithRelations,
    where: {
      OR: [{ participantOneId: userId }, { participantTwoId: userId }],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}
