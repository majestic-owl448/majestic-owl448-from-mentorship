import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  addExistingPostalEntitySetting,
  PostalEntitySettingAlreadyExistsError,
  PostalEntityUnavailableError,
  createPostalEntitySetting,
} from "@/lib/postalEntitySettings";
import {
  validateInitialPostalEntitySetting,
  validatePostalEntitySettingValues,
} from "@/lib/postalEntitySettingValidation";
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

    const postalEntityId =
      typeof body === "object" &&
      body !== null &&
      typeof (body as Record<string, unknown>).postalEntityId === "string"
        ? (body as Record<string, string>).postalEntityId.trim()
        : "";
    const existingValidation = postalEntityId
      ? validatePostalEntitySettingValues(body)
      : null;
    const newValidation = postalEntityId
      ? null
      : validateInitialPostalEntitySetting(body);
    const errors = existingValidation?.errors ?? newValidation?.errors;
    if (errors) {
      return NextResponse.json({ errors }, { status: 400 });
    }
    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);
    await upsertUserProfile(userId, user?.emails[0] ?? null);

    try {
      let postalEntitySetting;
      if (existingValidation?.data) {
        postalEntitySetting = await addExistingPostalEntitySetting(
          userId,
          postalEntityId,
          existingValidation.data
        );
      } else if (newValidation?.data) {
        postalEntitySetting = await createPostalEntitySetting(
          userId,
          newValidation.data
        );
      } else {
        throw new Error("Postal entity setting validation did not run.");
      }
      return NextResponse.json(
        { postalEntitySetting },
        { status: 201 }
      );
    } catch (caught) {
      if (caught instanceof PostalEntitySettingAlreadyExistsError) {
        return NextResponse.json(
          { error: caught.message },
          { status: 409 }
        );
      }
      if (caught instanceof PostalEntityUnavailableError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      throw caught;
    }
  });
}
