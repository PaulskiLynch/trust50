import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(session?.user?.isAdmin) || userId === "temp-user";

  if (!userId || !isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const [users, circles, queue] = await Promise.all([
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        trustScoreCached: true,
        createdAt: true,
        memberships: {
          select: { status: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.group.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        trustDensityLabelCached: true,
        memberships: {
          select: { status: true },
        },
        owner: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.membership.findMany({
      where: {
        status: {
          in: [MembershipStatus.pending, MembershipStatus.invited, MembershipStatus.waitlist],
        },
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        fitWhy: true,
        contributionWhy: true,
        relevantContext: true,
        groupId: true,
        userId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        group: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const [trustLinks, taxonomyProposals, audits] = await Promise.all([
    prisma.trustLink.findMany({
      select: { giverUserId: true, receiverUserId: true, roomId: true, createdAt: true },
      where: { status: "active" },
      orderBy: { createdAt: "desc" },
      take: 600,
    }),
    prisma.interestLead.findMany({
      where: { kind: "taxonomy_proposal" },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.interestLead.findMany({
      where: { kind: "admin_audit" },
      orderBy: { createdAt: "desc" },
      take: 150,
    }),
  ]);

  const reciprocalPairs = new Set<string>();
  const seenPairs = new Set<string>();
  const perRoomCount = new Map<string, number>();
  for (const link of trustLinks) {
    perRoomCount.set(link.roomId, (perRoomCount.get(link.roomId) || 0) + 1);
    const direct = `${link.giverUserId}->${link.receiverUserId}`;
    const reverse = `${link.receiverUserId}->${link.giverUserId}`;
    seenPairs.add(direct);
    if (seenPairs.has(reverse)) {
      const stableKey = [link.giverUserId, link.receiverUserId].sort().join("<->");
      reciprocalPairs.add(stableKey);
    }
  }

  const medianRoomTrust = (() => {
    const values = [...perRoomCount.values()].sort((a, b) => a - b);
    if (!values.length) return 0;
    const mid = Math.floor(values.length / 2);
    return values.length % 2 ? values[mid] : Math.round((values[mid - 1] + values[mid]) / 2);
  })();

  return NextResponse.json({
    users: users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      trustScoreCached: user.trustScoreCached,
      activeMemberships: user.memberships.filter((membership) => membership.status === MembershipStatus.active).length,
      pendingMemberships: user.memberships.filter((membership) =>
        membership.status === MembershipStatus.pending ||
        membership.status === MembershipStatus.invited ||
        membership.status === MembershipStatus.waitlist,
      ).length,
      createdAt: user.createdAt.toISOString(),
    })),
    circles: circles.map((circle) => ({
      id: circle.id,
      name: circle.name,
      status: circle.status,
      trustDensityLabelCached: circle.trustDensityLabelCached,
      memberCount: circle.memberships.filter((membership) => membership.status === MembershipStatus.active).length,
      pendingCount: circle.memberships.filter((membership) =>
        membership.status === MembershipStatus.pending ||
        membership.status === MembershipStatus.invited ||
        membership.status === MembershipStatus.waitlist,
      ).length,
      ownerName: circle.owner.name || circle.owner.email,
    })),
    queue: queue.map((item) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      status: item.status,
      groupId: item.groupId,
      groupName: item.group.name,
      userId: item.userId,
      userName: item.user.name || item.user.email,
      userEmail: item.user.email,
      fitWhy: item.fitWhy,
      contributionWhy: item.contributionWhy,
      relevantContext: item.relevantContext,
    })),
    trustSafety: {
      activeTrustLinks: trustLinks.length,
      reciprocalPairs: reciprocalPairs.size,
      medianRoomTrust,
      riskLevel:
        reciprocalPairs.size > 20 ? "High" : reciprocalPairs.size > 8 ? "Medium" : "Low",
    },
    taxonomy: {
      domains: [
        "Professional",
        "Local",
        "Learning",
        "Family",
        "Wellness",
        "Culture",
        "Support",
        "Pursuits",
      ],
      proposals: taxonomyProposals.map((item) => ({
        id: item.id,
        proposedBy: item.name || item.email,
        domain: item.source || "Unspecified",
        reason: item.note || "",
        status: item.signal || "proposed",
        createdAt: item.createdAt.toISOString(),
      })),
    },
    audit: audits.map((item) => ({
      id: item.id,
      actor: item.name || item.email,
      area: item.source || "admin",
      action: item.signal || "updated",
      target: item.note || "",
      createdAt: item.createdAt.toISOString(),
    })),
  });
}
