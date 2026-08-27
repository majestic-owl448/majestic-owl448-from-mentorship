import { NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  PostalEntitySettingNotFoundError,
  updatePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import { validatePostalEntitySettingValues } from "@/lib/postalEntitySettingValidation";

ensureSuperTokensInit();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ settingId: string }> }
) {
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

    const validation = validatePostalEntitySettingValues(body);
    if (validation.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    try {
      const { settingId } = await context.params;
      const postalEntitySetting = await updatePostalEntitySetting(
        session.getUserId(),
        settingId,
        validation.data
      );
      return NextResponse.json({ postalEntitySetting });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingNotFoundError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      throw caught;
    }
  });
}
