import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getGroupsWithRelations, getPublicDiscoveryGroups } from "@/lib/data";
import { syncGroupLifecycle } from "@/lib/groups";
import { prisma } from "@/lib/prisma";

const createGroupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional().default(""),
  who_for: z.string().min(1, "Who this group is for is required"),
  who_not_for: z.string().min(1, "Who this group is not for is required"),
  value_prop: z.string().min(1, "Value proposition is required"),
  price: z.number().int().min(0).max(300).nullable().optional(),
});

export async function GET() {
  const session = await getAuthSession();

  if (!session?.user?.id) {
    return NextResponse.json(await getPublicDiscoveryGroups());
  }

  return NextResponse.json(await getGroupsWithRelations(session.user.id));
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = createGroupSchema.parse(await req.json());

    const group = await prisma.$transaction(async (tx) => {
      const createdGroup = await tx.group.create({
        data: {
          name: payload.name,
          description: payload.description || null,
          whoFor: payload.who_for,
          whoNotFor: payload.who_not_for,
          valueProp: payload.value_prop,
          price: payload.price ?? null,
          ownerId: session.user.id,
        },
      });

      await tx.membership.create({
        data: {
          userId: session.user.id,
          groupId: createdGroup.id,
          role: "owner",
          status: "active",
        },
      });

      await syncGroupLifecycle(tx, createdGroup.id);

      return tx.group.findUniqueOrThrow({
        where: {
          id: createdGroup.id,
        },
      });
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Unable to create group" }, { status: 500 });
  }
}
