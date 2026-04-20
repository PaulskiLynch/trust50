import { prisma } from "@/lib/prisma";
import { buildCredibilityProfile } from "@/lib/credibility";

export async function getAccessibleProfile(viewerId: string, targetUserId: string) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      memberships: {
        where: { status: "active" },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              memberships: {
                where: { status: "active" },
                select: { userId: true, status: true },
              },
              requests: {
                select: {
                  kind: true,
                  title: true,
                  content: true,
                  creatorId: true,
                  replies: {
                    select: {
                      senderId: true,
                      body: true,
                      signal: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!targetUser) {
    return null;
  }

  const activeGroups = targetUser.memberships.map((membership) => membership.group);
  const sharedGroups = activeGroups.filter((group) =>
    group.memberships.some((membership) => membership.userId === viewerId),
  );

  if (viewerId !== targetUserId && sharedGroups.length === 0) {
    return null;
  }

  const credibility = buildCredibilityProfile(targetUser.id, activeGroups, targetUser);

  return {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    avatarUrl: targetUser.avatarUrl,
    headline: targetUser.headline,
    linkedinUrl: targetUser.linkedinUrl,
    whatsappNumber: targetUser.whatsappNumber,
    phoneNumber: targetUser.phoneNumber,
    workEmail: targetUser.workEmail,
    personalEmail: targetUser.personalEmail,
    activeGroups: activeGroups.map((group) => ({ id: group.id, name: group.name })),
    sharedGroups: sharedGroups.map((group) => ({ id: group.id, name: group.name })),
    credibility,
  };
}

export async function getCurrentUserProfile(viewerId: string) {
  const user = await prisma.user.findUnique({
    where: { id: viewerId },
    include: {
      memberships: {
        where: { status: "active" },
        include: {
          group: {
            select: {
              id: true,
              name: true,
              memberships: {
                where: { status: "active" },
                select: { userId: true, status: true },
              },
              requests: {
                select: {
                  kind: true,
                  title: true,
                  content: true,
                  creatorId: true,
                  replies: {
                    select: {
                      senderId: true,
                      body: true,
                      signal: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const activeGroups = user.memberships.map((membership) => membership.group);
  const credibility = buildCredibilityProfile(user.id, activeGroups, user);

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    headline: user.headline,
    linkedinUrl: user.linkedinUrl,
    bio: user.bio,
    company: user.company,
    role: user.role,
    credibility,
  };
}
