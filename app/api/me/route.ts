import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    const requestedUserId = request.nextUrl.searchParams.get("userId");
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    const profile = await getProfile();

    return NextResponse.json({
      userId: profile.id,
      email: profile.email,
      role: profile.role,
    });
  });
}
