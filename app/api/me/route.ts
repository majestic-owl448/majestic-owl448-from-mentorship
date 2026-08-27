import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

export async function GET(request: NextRequest) {
  return withSession(request, async (err, session) => {
    if (err) {
      return NextResponse.json(err, { status: 500 });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const userId = session.getUserId();
    const requestedUserId = request.nextUrl.searchParams.get("userId");
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const user = await supertokens.getUser(userId);
    const profile = await upsertUserProfile(userId, user?.emails[0] ?? null);

    return NextResponse.json({
      userId: profile.id,
      email: profile.email,
      role: profile.role,
    });
  });
}
