import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  listPostalEntitySettings,
  listAvailablePostalEntities,
  localDateInTimeZone,
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import {
  countryOptions,
  currencyOptions,
} from "@/lib/postalEntitySettingValidation";

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    const profile = await getProfile();
    let activePostalEntitySetting = null;
    try {
      activePostalEntitySetting = await requireActivePostalEntitySetting(userId);
    } catch (caught) {
      if (!(caught instanceof PostalEntitySettingRequiredError)) {
        throw caught;
      }
    }

    const [postalEntitySettings, availablePostalEntities] = await Promise.all([
      listPostalEntitySettings(userId),
      listAvailablePostalEntities(userId),
    ]);

    return NextResponse.json({
      role: profile.role,
      complete: activePostalEntitySetting !== null,
      activePostalEntitySetting,
      activeLocalDate:
        activePostalEntitySetting === null
          ? null
          : localDateInTimeZone(profile.timeZone),
      timeZone: profile.timeZone,
      timeZoneMode: profile.timeZoneMode,
      postalEntitySettings,
      availablePostalEntities,
      options: {
        countries: countryOptions(),
        currencies: currencyOptions(),
      },
    });
  });
}
