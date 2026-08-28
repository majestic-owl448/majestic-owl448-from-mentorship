import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
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

export async function POST(request: NextRequest) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
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
    await getProfile();
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
