import { NextResponse } from "next/server";
import { MembershipRole, MembershipStatus } from "@prisma/client";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getGroupById } from "@/lib/data";
import { getGroupCapacityEligibility } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const applySchema = z.object({
  fitWhy: z.string().min(20, "Share why you would be a good fit."),
  contributionWhy: z.string().min(20, "Share what you would contribute."),
  relevantContext: z.string().min(12, "Add a little relevant context."),
});

export async function GET(_: Request, context: RouteContext) {
  const session = await getAuthSession();
  const { id } = await context.params;
  const group = await getGroupById(id, session?.user?.id);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json(group);
}

export async function POST(req: Request, context: RouteContext) {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  const { id } = await context.params;
  const group = await getGroupById(id, session.user.id);

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  if (group.ownerId === session.user.id) {
    return NextResponse.json(
      { error: "You already curate this room. Rooms you curate do not count toward your 4-room member limit." },
      { status: 400 },
    );
  }

  let payload: z.infer<typeof applySchema>;

  try {
    payload = applySchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid application" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid application" }, { status: 400 });
  }

  const existingMembership = await prisma.membership.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId: id,
      },
    },
    include: {
      recommendedBy: true,
      votes: true,
      user: true,
    },
  });

  if (existingMembership?.status === MembershipStatus.active) {
    return NextResponse.json({ error: "You are already an active member of this room." }, { status: 400 });
  }

  if (
    existingMembership?.status === MembershipStatus.pending ||
    existingMembership?.status === MembershipStatus.waitlist ||
    existingMembership?.status === MembershipStatus.invited
  ) {
    return NextResponse.json(existingMembership);
  }

  const eligibility = await getGroupCapacityEligibility(prisma, session.user.id);

  if (!eligibility.eligible) {
    return NextResponse.json(
      {
        error:
          "You can join up to 4 rooms as a member. Leave a room before requesting access to another one. Rooms you curate do not count toward the limit.",
      },
      { status: 403 },
    );
  }

  const membership = await prisma.membership.create({
    data: {
      userId: session.user.id,
      groupId: id,
      role: MembershipRole.member,
      status: MembershipStatus.waitlist,
      fitWhy: payload.fitWhy.trim(),
      contributionWhy: payload.contributionWhy.trim(),
      relevantContext: payload.relevantContext.trim(),
    },
    include: {
      recommendedBy: true,
      votes: true,
      user: true,
    },
  });

  return NextResponse.json(membership, { status: 201 });
}
