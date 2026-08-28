import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { searchNamedFaceValues } from "@/lib/namedFaceValue";
import { countryOptions } from "@/lib/postalEntitySettingValidation";

const countryCodes = new Set(countryOptions().map(({ value }) => value));

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId }) => {
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
      namedFaceValues: await searchNamedFaceValues(
        countryCode,
        query,
        userId,
      ),
    });
  });
}
