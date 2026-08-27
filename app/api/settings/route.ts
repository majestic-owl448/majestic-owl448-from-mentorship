import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  CountrySettingRequiredError,
  requireActiveCountrySetting,
} from "@/lib/countrySettings";
import {
  countryOptions,
  currencyOptions,
} from "@/lib/countrySettingValidation";
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

    let activeCountrySetting = null;
    try {
      activeCountrySetting = await requireActiveCountrySetting(userId);
    } catch (caught) {
      if (!(caught instanceof CountrySettingRequiredError)) {
        throw caught;
      }
    }

    return NextResponse.json({
      complete: activeCountrySetting !== null,
      activeCountrySetting,
      options: {
        countries: countryOptions(),
        currencies: currencyOptions(),
      },
    });
  });
}
