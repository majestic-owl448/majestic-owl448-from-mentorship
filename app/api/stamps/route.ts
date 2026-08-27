import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import {
  createMonetaryStamp,
  listMonetaryStamps,
  presentMonetaryStamp,
  StampPostalEntityError,
} from "@/lib/stampInventory";
import { validateNewMonetaryStamp } from "@/lib/stampValidation";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

async function authenticatedContext(session: { getUserId(): string }) {
  const userId = session.getUserId();
  const user = await supertokens.getUser(userId);
  await upsertUserProfile(userId, user?.emails[0] ?? null);
  const activePostalEntitySetting =
    await requireActivePostalEntitySetting(userId);
  return { userId, activePostalEntitySetting };
}

function settingsRequiredResponse(error: PostalEntitySettingRequiredError) {
  return NextResponse.json(
    { error: error.message, settingsUrl: "/dashboard" },
    { status: 409 },
  );
}

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

    try {
      const { userId, activePostalEntitySetting } =
        await authenticatedContext(session);
      const stamps = await listMonetaryStamps(
        userId,
        activePostalEntitySetting,
      );
      return NextResponse.json({
        activeCountryCode:
          activePostalEntitySetting.postalEntity.countryCode,
        displayCurrencyCode:
          activePostalEntitySetting.displayCurrencyCode,
        stamps,
      });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingRequiredError) {
        return settingsRequiredResponse(caught);
      }
      throw caught;
    }
  });
}

export async function POST(request: NextRequest) {
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

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }
    const validation = validateNewMonetaryStamp(body);
    if (validation.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    try {
      const { userId, activePostalEntitySetting } =
        await authenticatedContext(session);
      const created = await createMonetaryStamp(userId, validation.data);
      return NextResponse.json(
        {
          stamp: await presentMonetaryStamp(
            created,
            activePostalEntitySetting,
          ),
        },
        { status: 201 },
      );
    } catch (caught) {
      if (caught instanceof PostalEntitySettingRequiredError) {
        return settingsRequiredResponse(caught);
      }
      if (caught instanceof StampPostalEntityError) {
        return NextResponse.json(
          { errors: { postalEntityId: caught.message } },
          { status: 400 },
        );
      }
      throw caught;
    }
  });
}
