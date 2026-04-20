import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const interestSchema = z.object({
  email: z.email().transform((value) => value.trim().toLowerCase()),
  kind: z.enum(["explore", "curator"]),
  name: z.string().trim().max(120).optional().or(z.literal("")),
  source: z.string().trim().max(120).optional().or(z.literal("")),
  signal: z.string().trim().max(500).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const payload = interestSchema.parse(await request.json());

    await prisma.interestLead.create({
      data: {
        email: payload.email,
        kind: payload.kind,
        name: payload.name || null,
        source: payload.source || null,
        signal: payload.signal || null,
        note: payload.note || null,
      },
    });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || "Invalid details." }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json({ error: "Unable to save your interest right now." }, { status: 500 });
  }
}
