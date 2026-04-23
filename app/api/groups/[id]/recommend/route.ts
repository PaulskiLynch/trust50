import { MembershipStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getGroupById } from "@/lib/data";
import { safeUserSelect } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const recommendSchema = z.object({
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

  const recommenderMembership = group.memberships.find(
    (membership) => membership.userId === session.user.id && membership.status === MembershipStatus.active,
  );

  if (!recommenderMembership && group.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Only active members can sponsor applicants." }, { status: 403 });
  }

  let payload: z.infer<typeof recommendSchema>;

  try {
    payload = recommendSchema.parse(await req.json());
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid sponsorship" }, { status: 400 });
    }

    return NextResponse.json({ error: "Invalid sponsorship" }, { status: 400 });
  }

  const targetMembership = await prisma.membership.findFirst({
    where: {
      id: payload.membershipId,
      groupId: id,
      status: MembershipStatus.waitlist,
    },
    include: {
      user: {
        select: safeUserSelect,
      },
      votes: true,
      recommendedBy: {
        select: safeUserSelect,
      },
    },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Candidate not found in the queue." }, { status: 404 });
  }

  if (targetMembership.userId === session.user.id) {
    return NextResponse.json({ error: "You cannot sponsor your own application." }, { status: 400 });
  }

  if (targetMembership.recommendedByUserId) {
    return NextResponse.json({ error: "This candidate already has a sponsor." }, { status: 400 });
  }

  const updatedMembership = await prisma.membership.update({
    where: { id: targetMembership.id },
    data: {
      status: MembershipStatus.pending,
      recommendedByUserId: session.user.id,
    },
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

  return NextResponse.json(updatedMembership);
}
