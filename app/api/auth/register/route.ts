import { NextResponse } from "next/server";
import { z } from "zod";

import { hashPassword } from "@/lib/passwords";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(8).max(128),
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

function buildHeadline(role?: string, company?: string) {
  if (role && company) return `${role} @ ${company}`;
  return role || company || null;
}

export async function POST(request: Request) {
  try {
    const payload = registerSchema.parse(await request.json());

    const existingUser = await prisma.user.findUnique({
      where: {
        email: payload.email,
      },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    }

    const user = await prisma.user.create({
      data: {
        name: payload.name,
        email: payload.email,
        company: payload.company || null,
        role: payload.role || null,
        location: payload.location || null,
        stageIndustry: payload.stageIndustry || null,
        helpTags: payload.helpTags || null,
        workingOn: payload.workingOn || null,
        fitRoles: payload.fitRoles || null,
        proof: payload.proof || null,
        introPolicy: payload.introPolicy || null,
        bio: payload.bio || null,
        headline: buildHeadline(payload.role || undefined, payload.company || undefined),
        passwordHash: hashPassword(payload.password),
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid registration details." }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
  }
}
