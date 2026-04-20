import { NextResponse } from "next/server";

import { getAuthSession } from "@/lib/auth";
import { getCurrentUserProfile } from "@/lib/profiles";

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
