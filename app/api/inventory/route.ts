import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  PostalEntitySettingRequiredError,
  localDateInTimeZone,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

export async function GET(request: NextRequest) {
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

    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);
    await upsertUserProfile(userId, user?.emails[0] ?? null);

    try {
      const activePostalEntitySetting =
        await requireActivePostalEntitySetting(userId);
      return NextResponse.json({
        activePostalEntitySetting,
        localDate: localDateInTimeZone(activePostalEntitySetting.timeZone),
      });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingRequiredError) {
        return NextResponse.json(
          { error: caught.message, settingsUrl: "/dashboard" },
          { status: 409 }
        );
      }
      throw caught;
    }
  });
}
