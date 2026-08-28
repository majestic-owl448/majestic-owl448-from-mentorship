import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";

export function withModerator(
  request: NextRequest,
  handler: (moderatorId: string) => Promise<Response>,
) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    const profile = await getProfile();
    if (profile.role !== "MODERATOR") {
      return NextResponse.json(
        { error: "Moderator access required" },
        { status: 403 },
      );
    }

    return handler(userId);
  });
}
