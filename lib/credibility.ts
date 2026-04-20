export type CredibilityUser = {
  id: string;
  linkedinUrl?: string | null;
  workEmail?: string | null;
};

export type CredibilityReply = {
  senderId: string;
  body?: string | null;
  signal?: string | null;
  createdAt: string | Date;
};

export type CredibilityRequest = {
  kind?: string | null;
  title?: string | null;
  content: string;
  creatorId?: string | null;
  replies: CredibilityReply[];
};

export type CredibilityMembership = {
  userId: string;
  status: string;
};

export type CredibilityGroup = {
  id: string;
  name: string;
  memberships: CredibilityMembership[];
  requests: CredibilityRequest[];
};

export type TrustLevel = "New" | "Contributor" | "Trusted";

export type CredibilityProfile = {
  trustLevel: TrustLevel;
  helpfulRepliesCount: number;
  replyCountRecent: number;
  groupsActiveIn: string[];
  knownFor: string[];
  verification: string[];
};

const TAG_PATTERNS: Array<{ tag: string; patterns: RegExp[] }> = [
  { tag: "Hiring", patterns: [/hire/i, /hiring/i, /candidate/i, /talent/i, /recruit/i] },
  { tag: "Fundraising", patterns: [/fundrais/i, /series [abc]/i, /investor/i, /board/i, /round/i] },
  { tag: "Product", patterns: [/product/i, /vp product/i, /roadmap/i] },
  { tag: "Operations", patterns: [/operations/i, /operator/i, /process/i, /execution/i] },
  { tag: "Connections", patterns: [/connect/i, /intro/i, /partner/i, /network/i] },
  { tag: "Fintech", patterns: [/fintech/i, /cfo/i, /finance/i] },
  { tag: "Biotech", patterns: [/biotech/i, /clinical/i, /cmo/i, /pharma/i, /regulatory/i] },
  { tag: "Growth", patterns: [/growth/i, /gtm/i, /sales/i, /go-to-market/i] },
];

const KNOWN_FOR_OVERRIDES: Record<string, string[]> = {
  "claire-clinical": [
    "Known for timing first CMO hires around Phase I inflection points",
    "Known for translating clinical strategy into board-level decisions",
  ],
  "priya-reg": [
    "Known for getting FDA-facing teams through first formal regulatory builds",
    "Known for deciding when US expansion adds leverage versus drag",
  ],
  "sofia-bd": [
    "Known for structuring EU-US biotech partnership paths without losing speed",
    "Known for turning early pharma conversations into concrete next steps",
  ],
  "hannah-board": [
    "Known for framing clinical risk so later-stage investors stay in the process",
    "Known for board discipline in capital-heavy biotech decisions",
  ],
  "lucia-medical": [
    "Known for fixing CMO and regulatory hiring mistakes before they compound",
    "Known for clinical leadership tradeoffs in sub-100 person biotech teams",
  ],
  "elise-strategy": [
    "Known for pressure-testing fundraising narratives with life sciences boards",
    "Known for forcing sharper decisions when boards start to overreach",
  ],
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() || "";
}

function getHelpfulSignalCount(replies: CredibilityReply[], userId: string) {
  return replies.filter((reply) => {
    if (reply.senderId !== userId) return false;
    const signal = normalizeText(reply.signal).toLowerCase();
    return signal.includes("helpful") || signal.includes("useful") || signal.includes("conversation") || signal.includes("introduction");
  }).length;
}

function extractKnownForTags(text: string) {
  return TAG_PATTERNS.filter(({ patterns }) => patterns.some((pattern) => pattern.test(text))).map(({ tag }) => tag);
}

export function buildCredibilityProfile(
  userId: string,
  groups: CredibilityGroup[],
  user?: CredibilityUser | null,
): CredibilityProfile {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const groupsActiveIn = groups
    .filter((group) =>
      group.memberships.some((membership) => membership.userId === userId && membership.status === "active"),
    )
    .map((group) => group.name);

  const recentReplies = groups.flatMap((group) =>
    group.requests.flatMap((request) =>
      request.replies.filter((reply) => reply.senderId === userId && +new Date(reply.createdAt) >= cutoff),
    ),
  );

  const helpfulRepliesCount = groups.reduce(
    (count, group) =>
      count +
      group.requests.reduce((requestCount, request) => requestCount + getHelpfulSignalCount(request.replies, userId), 0),
    0,
  );

  const replyCountRecent = recentReplies.length;

  let trustLevel: TrustLevel = "New";
  if (replyCountRecent >= 2 || helpfulRepliesCount >= 1 || groupsActiveIn.length >= 2) {
    trustLevel = "Contributor";
  }
  if (replyCountRecent >= 5 || helpfulRepliesCount >= 3 || groupsActiveIn.length >= 3) {
    trustLevel = "Trusted";
  }

  const tagScores = new Map<string, number>();
  groups.forEach((group) => {
    group.requests.forEach((request) => {
      const authoredReplyBodies = request.replies
        .filter((reply) => reply.senderId === userId)
        .map((reply) => normalizeText(reply.body));

      const relevantTexts = [
        ...(request.creatorId === userId ? [normalizeText(request.title), normalizeText(request.content)] : []),
        ...authoredReplyBodies,
      ].filter(Boolean);

      relevantTexts.forEach((text) => {
        extractKnownForTags(text).forEach((tag) => {
          tagScores.set(tag, (tagScores.get(tag) || 0) + 1);
        });
        if (request.kind === "question") tagScores.set("Questions", (tagScores.get("Questions") || 0) + 1);
        if (request.kind === "insight") tagScores.set("Insight", (tagScores.get("Insight") || 0) + 1);
      });
    });
  });

  const knownFor =
    KNOWN_FOR_OVERRIDES[userId] ||
    [...tagScores.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([tag]) => tag);

  const verification = [
    user?.linkedinUrl ? "LinkedIn verified" : null,
    user?.workEmail ? "Work identity" : null,
  ].filter(Boolean) as string[];

  return {
    trustLevel,
    helpfulRepliesCount,
    replyCountRecent,
    groupsActiveIn,
    knownFor,
    verification,
  };
}
