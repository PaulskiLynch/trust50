export type TrustDomain =
  | "Professional"
  | "Local"
  | "Learning"
  | "Family"
  | "Wellness"
  | "Culture"
  | "Support"
  | "Pursuits";

export type TrustTaxonomyNode = {
  domain: TrustDomain;
  categories: string[];
  trustTest: string;
};

export type RoomTaxonomy = {
  domain: TrustDomain;
  category: string;
  specialty: string;
  trustTest: string;
};

export const TRUST_TAXONOMY: TrustTaxonomyNode[] = [
  {
    domain: "Professional",
    categories: ["Startups", "Operators", "Investing", "Real Estate", "Healthcare", "Career"],
    trustTest: "Stage/function alignment",
  },
  {
    domain: "Local",
    categories: ["Neighborhoods", "City Life", "Local Business", "Housing", "Schools", "Safety"],
    trustTest: "Proximity + accountability",
  },
  {
    domain: "Learning",
    categories: ["AI Skills", "Coding", "Business", "Investing", "Career Change"],
    trustTest: "High stakes only",
  },
  {
    domain: "Family",
    categories: ["Parenting", "Schools", "Childcare", "Elder Care", "Special Needs"],
    trustTest: "Shared vulnerability",
  },
  {
    domain: "Wellness",
    categories: ["Mental Health", "Recovery", "Chronic Illness", "Care Teams"],
    trustTest: "Shared struggle",
  },
  {
    domain: "Culture",
    categories: ["Identity", "Faith", "Diaspora", "Values", "Underrepresented Groups"],
    trustTest: "Belonging + safety",
  },
  {
    domain: "Support",
    categories: ["Job Search", "Founder Support", "Relocation", "Caregiving", "Grief", "Life Transitions"],
    trustTest: "Crisis + mutual aid",
  },
  {
    domain: "Pursuits",
    categories: ["Competitive Sports", "Outdoor Adventure", "Collecting", "Investing Clubs", "Private Travel", "Creative Practice"],
    trustTest: "Trust changes outcome",
  },
];

export const TAXONOMY_RULE = "A category belongs here only if trust changes the quality of the room.";

export const ENTRY_RULES = [
  "Invite-only",
  "Sponsor required",
  "Member vouch required",
  "Curator review + vouch",
] as const;

const taxonomyByDomain = new Map(TRUST_TAXONOMY.map((node) => [node.domain, node]));

export function getTaxonomyNode(domain: TrustDomain) {
  return taxonomyByDomain.get(domain) ?? TRUST_TAXONOMY[0];
}

export function taxonomyFilterLabels() {
  return [
    ...TRUST_TAXONOMY.map((node) => node.domain),
    ...TRUST_TAXONOMY.flatMap((node) => node.categories),
  ];
}

export const SAMPLE_ROOM_TAXONOMY: Record<string, RoomTaxonomy> = {
  "group-founders": {
    domain: "Professional",
    category: "Startups",
    specialty: "Warsaw founders making hiring, growth, and fundraising decisions",
    trustTest: "Stage/function alignment",
  },
  "group-operators": {
    domain: "Professional",
    category: "Operators",
    specialty: "Operators trading practical execution judgment",
    trustTest: "Stage/function alignment",
  },
  "group-women-pharma": {
    domain: "Professional",
    category: "Healthcare",
    specialty: "Women leaders navigating pharma and clinical decisions",
    trustTest: "Stage/function alignment",
  },
  "group-digital-pharma": {
    domain: "Professional",
    category: "Healthcare",
    specialty: "Digital pharma operators working through AI adoption",
    trustTest: "Stage/function alignment",
  },
  "group-health-ai": {
    domain: "Learning",
    category: "AI Skills",
    specialty: "Health AI builders applying new tools in regulated contexts",
    trustTest: "High stakes only",
  },
  "group-property-management": {
    domain: "Professional",
    category: "Real Estate",
    specialty: "Property operators solving onsite, leasing, and maintenance tradeoffs",
    trustTest: "Stage/function alignment",
  },
  "group-investments": {
    domain: "Professional",
    category: "Investing",
    specialty: "Investors and operators underwriting private-market risk",
    trustTest: "Stage/function alignment",
  },
  "group-dog-training": {
    domain: "Pursuits",
    category: "Creative Practice",
    specialty: "Specialist trainers where trust changes client outcomes",
    trustTest: "Trust changes outcome",
  },
  "group-music-production": {
    domain: "Pursuits",
    category: "Creative Practice",
    specialty: "Music producers sharing deal, collaborator, and creative judgment",
    trustTest: "Trust changes outcome",
  },
};

export function fallbackRoomTaxonomy(text: string): RoomTaxonomy {
  const normalized = text.toLowerCase();

  if (normalized.match(/pharma|health|clinical|medical|biotech/)) {
    return {
      domain: "Professional",
      category: "Healthcare",
      specialty: "Healthcare operators making high-context decisions",
      trustTest: "Stage/function alignment",
    };
  }

  if (normalized.match(/invest|fund|capital|finance|cfo|risk/)) {
    return {
      domain: "Professional",
      category: "Investing",
      specialty: "Investment decisions where judgment and access matter",
      trustTest: "Stage/function alignment",
    };
  }

  if (normalized.match(/property|real estate|housing|local/)) {
    return {
      domain: "Professional",
      category: "Real Estate",
      specialty: "Real estate operators with local accountability",
      trustTest: "Stage/function alignment",
    };
  }

  if (normalized.match(/creative|music|audio|producer|training/)) {
    return {
      domain: "Pursuits",
      category: "Creative Practice",
      specialty: "Creative practitioners where trusted peers change the outcome",
      trustTest: "Trust changes outcome",
    };
  }

  return {
    domain: "Professional",
    category: "Operators",
    specialty: "Trusted peers making practical decisions",
    trustTest: "Stage/function alignment",
  };
}

export function taxonomySearchText(taxonomy: RoomTaxonomy) {
  return `${taxonomy.domain} ${taxonomy.category} ${taxonomy.specialty} ${taxonomy.trustTest}`;
}
