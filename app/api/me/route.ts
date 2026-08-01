import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";

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
    const user = await supertokens.getUser(userId);

    return NextResponse.json({
      userId,
      // Apple only sends the email on first sign-in, so it comes off the stored
      // user rather than the access token payload.
      email: user?.emails[0] ?? null,
    });
  });
}
