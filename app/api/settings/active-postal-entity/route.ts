import { NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  activatePostalEntitySetting,
  localDateInTimeZone,
  PostalEntitySettingNotFoundError,
} from "@/lib/postalEntitySettings";

ensureSuperTokensInit();

export async function PATCH(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, { status: 500 });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

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
        session.getUserId(),
        settingId
      );
      return NextResponse.json({
        activePostalEntitySetting,
        activeLocalDate: localDateInTimeZone(activePostalEntitySetting.timeZone),
      });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingNotFoundError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      throw caught;
    }
  });
}
