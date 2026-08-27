import { NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import { searchNamedFaceValues } from "@/lib/namedFaceValue";
import { countryOptions } from "@/lib/postalEntitySettingValidation";

ensureSuperTokensInit();

const countryCodes = new Set(countryOptions().map(({ value }) => value));

export async function GET(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, { status: 500 });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 },
      );
    }

    const countryCode = (
      request.nextUrl.searchParams.get("countryCode") ?? ""
    )
      .trim()
      .toUpperCase();
    if (!countryCodes.has(countryCode)) {
      return NextResponse.json(
        { errors: { countryCode: "Select a country before searching." } },
        { status: 400 },
      );
    }

    const query = request.nextUrl.searchParams.get("query") ?? "";
    return NextResponse.json({
      namedFaceValues: await searchNamedFaceValues(countryCode, query),
    });
  });
}
