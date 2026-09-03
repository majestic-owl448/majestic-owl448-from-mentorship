import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  activatePostalEntitySetting,
  PostalEntitySettingNotFoundError,
} from "@/lib/postalEntitySettings";

export async function PATCH(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId }) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const settingId =
      typeof body === "object" &&
      body !== null &&
      typeof (body as Record<string, unknown>).settingId === "string"
        ? (body as Record<string, string>).settingId.trim()
        : "";
    if (!settingId) {
      return NextResponse.json(
        { error: "Select a postal entity setting." },
        { status: 400 }
      );
    }

    try {
      const activePostalEntitySetting = await activatePostalEntitySetting(
        userId,
        settingId
      );
      return NextResponse.json({
        activePostalEntitySetting,
      });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingNotFoundError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      throw caught;
    }
  });
}
