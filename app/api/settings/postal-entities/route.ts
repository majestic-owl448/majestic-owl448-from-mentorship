import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  PostalEntitySettingAlreadyExistsError,
  createInitialPostalEntitySetting,
} from "@/lib/postalEntitySettings";
import { validateInitialPostalEntitySetting } from "@/lib/postalEntitySettingValidation";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

export async function POST(request: NextRequest) {
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

    const validation = validateInitialPostalEntitySetting(body);
    if (validation.errors) {
      return NextResponse.json(
        { errors: validation.errors },
        { status: 400 }
      );
    }

    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);
    await upsertUserProfile(userId, user?.emails[0] ?? null);

    try {
      const activePostalEntitySetting =
        await createInitialPostalEntitySetting(userId, validation.data);
      return NextResponse.json(
        { activePostalEntitySetting },
        { status: 201 }
      );
    } catch (caught) {
      if (caught instanceof PostalEntitySettingAlreadyExistsError) {
        return NextResponse.json(
          { error: caught.message },
          { status: 409 }
        );
      }
      throw caught;
    }
  });
}
