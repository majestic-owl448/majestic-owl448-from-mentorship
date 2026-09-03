import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  localDateInTimeZone,
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    try {
      const profile = await getProfile();
      const activePostalEntitySetting =
        await requireActivePostalEntitySetting(userId);
      return NextResponse.json({
        activePostalEntitySetting,
        localDate: localDateInTimeZone(profile.timeZone),
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
