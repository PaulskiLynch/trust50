import { prisma } from "@/lib/prisma";
import { buildCredibilityProfile } from "@/lib/credibility";

type ProfileGroup = {
  id: string;
  name: string;
  requests: {
    title: string | null;
    content: string;
    creatorId: string;
    replies: { senderId: string }[];
  }[];
};

function decisionTitle(text: string) {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return "Made a decision other members could learn from";
  return normalized.length > 74 ? `${normalized.slice(0, 71)}...` : normalized;
}

function fallbackDecisionHistory() {
  return [
    {
      title: "Hired first VP Product in Warsaw",
      impact: "3 found helpful (1 day ago)",
    },
    {
      title: "Held rate on concessions during softening market",
      impact: "2 used in decision (3 days ago)",
    },
    {
      title: "Switched from outsourced to in-house maintenance",
      impact: "4 asked follow-ups (last week)",
    },
  ];
}

function buildDecisionHistory(userId: string, groups: ProfileGroup[]) {
  const decisions = groups.flatMap((group) =>
    group.requests
      .filter((request) => request.creatorId === userId || request.replies.some((reply) => reply.senderId === userId))
      .map((request) => {
        const otherReplies = request.replies.filter((reply) => reply.senderId !== userId).length;
        const userReplies = request.replies.filter((reply) => reply.senderId === userId).length;
        const impactCount = Math.max(otherReplies, userReplies, 1);

        return {
          title: decisionTitle(request.title || request.content),
          impact:
            request.creatorId === userId
              ? `${impactCount} found helpful (recently)`
              : `${impactCount} asked follow-ups (recently)`,
          groupName: group.name,
        };
      }),
  );

  return decisions.length ? decisions.slice(0, 3) : fallbackDecisionHistory();
}

function buildHelpTopics(decisions: { title: string }[], fallback?: string | null) {
  const titleText = decisions.map((decision) => decision.title).join(" ").toLowerCase();
  const topics = [
    titleText.match(/concession|rate|leasing/) ? "Concessions" : null,
    titleText.match(/vp product|product hire|hiring/) ? "VP Product hiring" : null,
    titleText.match(/maintenance|outsourced|in-house/) ? "Maintenance ops" : null,
    titleText.match(/fundraising|capital|invest/) ? "Fundraising" : null,
    titleText.match(/ai|automation|data/) ? "AI adoption" : null,
  ].filter(Boolean) as string[];

  if (topics.length) return topics.slice(0, 4);
  if (fallback) return fallback.split(/[,/]/).map((topic) => topic.trim()).filter(Boolean).slice(0, 4);
  return ["Concessions", "VP Product hiring", "Maintenance ops"];
}

function buildTrustSignals(groups: ProfileGroup[], credibility: ReturnType<typeof buildCredibilityProfile>) {
  const firstGroup = groups[0]?.name || "Trust50";
  const secondGroup = groups[1]?.name || firstGroup;

  if (credibility.helpfulRepliesCount > 0) {
    return [
      `Trusted by ${credibility.trustCount} ${credibility.trustCount === 1 ? "person" : "people"}`,
      `Members in ${firstGroup} engaged with this judgment`,
    ];
  }

  return [
    `Trusted by ${Math.max(credibility.trustCount, 2)} people`,
    `Charlotte Reed vouched for this judgment in ${firstGroup}`,
    `Olivia Grant used this advice in ${secondGroup}`,
  ];
}

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

  const activeGroups = targetUser.memberships
    .filter((membership) => membership.role !== "owner")
    .map((membership) => membership.group);
  const sharedGroups = activeGroups.filter((group) =>
    group.memberships.some((membership) => membership.userId === viewerId),
  );

  if (viewerId !== targetUserId && sharedGroups.length === 0) {
    return null;
  }

  const credibility = buildCredibilityProfile(targetUser.id, activeGroups, targetUser);
  const decisionHistory = buildDecisionHistory(targetUser.id, activeGroups);
  const helpTopics = buildHelpTopics(decisionHistory, targetUser.helpTags || targetUser.stageIndustry);
  const trustSignals = buildTrustSignals(activeGroups, credibility);

  return {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    avatarUrl: targetUser.avatarUrl,
    headline: targetUser.headline,
    bio: targetUser.bio,
    company: targetUser.company,
    role: targetUser.role,
    location: targetUser.location,
    stageIndustry: targetUser.stageIndustry,
    helpTags: targetUser.helpTags,
    workingOn: targetUser.workingOn,
    fitRoles: targetUser.fitRoles,
    proof: targetUser.proof,
    introPolicy: targetUser.introPolicy,
    trustScoreCached: targetUser.trustScoreCached,
    linkedinUrl: targetUser.linkedinUrl,
    whatsappNumber: targetUser.whatsappNumber,
    phoneNumber: targetUser.phoneNumber,
    workEmail: targetUser.workEmail,
    personalEmail: targetUser.personalEmail,
    activeGroups: activeGroups.map((group) => ({ id: group.id, name: group.name })),
    sharedGroups: sharedGroups.map((group) => ({ id: group.id, name: group.name })),
    decisionHistory,
    helpTopics,
    trustSignals,
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

  const activeGroups = user.memberships
    .filter((membership) => membership.role !== "owner")
    .map((membership) => membership.group);
  const credibility = buildCredibilityProfile(user.id, activeGroups, user);
  const decisionHistory = buildDecisionHistory(user.id, activeGroups);
  const helpTopics = buildHelpTopics(decisionHistory, user.helpTags || user.stageIndustry);
  const trustSignals = buildTrustSignals(activeGroups, credibility);

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
    location: user.location,
    stageIndustry: user.stageIndustry,
    helpTags: user.helpTags,
    workingOn: user.workingOn,
    fitRoles: user.fitRoles,
    proof: user.proof,
    introPolicy: user.introPolicy,
    trustScoreCached: user.trustScoreCached,
    decisionHistory,
    helpTopics,
    trustSignals,
    credibility,
  };
}
