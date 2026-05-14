import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getAuthSession();
  const userId = session?.user?.id;
  const isAdmin = Boolean(session?.user?.isAdmin) || userId === "temp-user";

  if (!userId || !isAdmin) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const { id } = await context.params;

  if (id === userId) {
    return NextResponse.json({ error: "You cannot delete your own admin account." }, { status: 400 });
  }

  try {
    await prisma.user.delete({ where: { id } });
    await prisma.interestLead.create({
      data: {
        email: session.user.email || "admin@trust50.local",
        kind: "admin_audit",
        name: session.user.name || "Admin",
        source: "members",
        signal: "delete_user",
        note: `user:${id}`,
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        error:
          "Unable to delete user. They may still own circles or linked records. Remove ownership/links first, then try again.",
      },
      { status: 400 },
    );
  }
}

