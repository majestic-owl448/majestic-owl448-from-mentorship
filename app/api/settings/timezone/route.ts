import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { updateTimeZonePreference, validateTimeZonePreference } from "@/lib/timeZonePreference";

export async function PATCH(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }
    const validation = validateTimeZonePreference(body);
    if (validation.errors) return NextResponse.json({ errors: validation.errors }, { status: 400 });
    await getProfile();
    const profile = await updateTimeZonePreference(userId, validation.data);
    return NextResponse.json({ timeZone: profile.timeZone, timeZoneMode: profile.timeZoneMode });
  });
}
