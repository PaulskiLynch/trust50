import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getGroupById } from "@/lib/data";
import { getMembershipVoteThreshold, safeUserSelect, syncGroupLifecycle } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const voteSchema = z.object({
  membershipId: z.string().min(1),
});

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

  const voterMembership = group.memberships.find(
    (membership) => membership.userId === session.user.id && membership.status === MembershipStatus.active,
  );

  if (!voterMembership && group.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only active members can attest fit for new applicants." }, { status: 403 });
  }

  let payload: z.infer<typeof voteSchema>;

  try {
    payload = voteSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid attestation" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid attestation" }, { status: 400 });
  }

  const targetMembership = await prisma.membership.findFirst({
    where: {
      id: payload.membershipId,
      groupId: id,
      status: {
        in: [MembershipStatus.pending, MembershipStatus.waitlist],
      },
    },
    include: {
      votes: true,
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
  }

  if (targetMembership.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot attest to your own application." }, { status: 400 });
  }

  const existingVote = await prisma.membershipVote.findUnique({
    where: {
      membershipId_voterId: {
        membershipId: targetMembership.id,
        voterId: session.user.id,
      },
    },
  });

  if (existingVote) {
    return NextResponse.json({ error: "You already attested to this applicant." }, { status: 400 });
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.membershipVote.create({
      data: {
        membershipId: targetMembership.id,
        voterId: session.user.id,
      },
    });

    const activeMemberCount = await tx.membership.count({
      where: {
        groupId: id,
        status: MembershipStatus.active,
      },
    });

    const voteCount = await tx.membershipVote.count({
      where: {
        membershipId: targetMembership.id,
      },
    });

    const threshold = getMembershipVoteThreshold(activeMemberCount);
    const shouldAccept = voteCount >= threshold;

    if (shouldAccept) {
      await tx.membership.update({
        where: { id: targetMembership.id },
        data: { status: MembershipStatus.active },
      });

      await syncGroupLifecycle(tx, id);
    }

    const membership = await tx.membership.findUniqueOrThrow({
      where: { id: targetMembership.id },
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
    });

    return {
      membership,
      threshold,
      accepted: shouldAccept,
    };
  });

  return NextResponse.json(result);
}
