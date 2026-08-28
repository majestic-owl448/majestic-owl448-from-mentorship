import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

export function withModerator(
  request: NextRequest,
  handler: (moderatorId: string) => Promise<Response>,
) {
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, { status: 500 });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);
    const profile = await upsertUserProfile(userId, user?.emails[0] ?? null);
    if (profile.role !== "MODERATOR") {
      return NextResponse.json(
        { error: "Moderator access required" },
        { status: 403 },
      );
    }

    return handler(userId);
  });
}
