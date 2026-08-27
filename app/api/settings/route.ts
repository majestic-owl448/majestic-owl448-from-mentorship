import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import {
  countryOptions,
  currencyOptions,
} from "@/lib/postalEntitySettingValidation";
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

    let activePostalEntitySetting = null;
    try {
      activePostalEntitySetting = await requireActivePostalEntitySetting(userId);
    } catch (caught) {
      if (!(caught instanceof PostalEntitySettingRequiredError)) {
        throw caught;
      }
    }

    return NextResponse.json({
      complete: activePostalEntitySetting !== null,
      activePostalEntitySetting,
      options: {
        countries: countryOptions(),
        currencies: currencyOptions(),
      },
    });
  });
}
