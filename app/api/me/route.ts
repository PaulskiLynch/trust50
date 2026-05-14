import { NextResponse } from "next/server";
import { z } from "zod";

import { getAuthSession } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profiles";
import { prisma } from "@/lib/prisma";

const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  avatarUrl: z.string().trim().max(1000).url().optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  location: z.string().trim().max(120).optional().or(z.literal("")),
  stageIndustry: z.string().trim().max(180).optional().or(z.literal("")),
  helpTags: z.string().trim().max(300).optional().or(z.literal("")),
  workingOn: z.string().trim().max(240).optional().or(z.literal("")),
  fitRoles: z.string().trim().max(240).optional().or(z.literal("")),
  proof: z.string().trim().max(500).optional().or(z.literal("")),
  introPolicy: z.string().trim().max(300).optional().or(z.literal("")),
  bio: z.string().trim().max(500).optional().or(z.literal("")),
});

function buildHeadline(role?: string | null, company?: string | null) {
  if (role && company) return `${role} @ ${company}`;
  return role || company || null;
}

export async function GET() {
  const session = await getAuthSession();
  const viewerId = session?.user?.id;

  if (!viewerId) {
    return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
  }

  const profile = await getCurrentUserProfile(viewerId);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  return NextResponse.json(profile);
}

export async function PATCH(request: Request) {
  try {
    const session = await getAuthSession();
    const viewerId = session?.user?.id;

    if (!viewerId) {
      return NextResponse.json({ error: "You must be signed in" }, { status: 401 });
    }

    const payload = updateProfileSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { id: viewerId } });

    if (!existing) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const nextRole = payload.role !== undefined ? payload.role || null : existing.role;
    const nextCompany = payload.company !== undefined ? payload.company || null : existing.company;

    await prisma.user.update({
      where: { id: viewerId },
      data: {
        ...(payload.name !== undefined ? { name: payload.name } : {}),
        ...(payload.avatarUrl !== undefined ? { avatarUrl: payload.avatarUrl || null } : {}),
        ...(payload.company !== undefined ? { company: payload.company || null } : {}),
        ...(payload.role !== undefined ? { role: payload.role || null } : {}),
        ...(payload.location !== undefined ? { location: payload.location || null } : {}),
        ...(payload.stageIndustry !== undefined ? { stageIndustry: payload.stageIndustry || null } : {}),
        ...(payload.helpTags !== undefined ? { helpTags: payload.helpTags || null } : {}),
        ...(payload.workingOn !== undefined ? { workingOn: payload.workingOn || null } : {}),
        ...(payload.fitRoles !== undefined ? { fitRoles: payload.fitRoles || null } : {}),
        ...(payload.proof !== undefined ? { proof: payload.proof || null } : {}),
        ...(payload.introPolicy !== undefined ? { introPolicy: payload.introPolicy || null } : {}),
        ...(payload.bio !== undefined ? { bio: payload.bio || null } : {}),
        headline: buildHeadline(nextRole, nextCompany),
      },
    });

    const profile = await getCurrentUserProfile(viewerId);
    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid profile details." }, { status: 400 });
    }

    return NextResponse.json({ error: "Unable to update profile." }, { status: 500 });
  }
}
