import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import {
  calculateInventoryTotal,
  createStamp,
  listStamps,
  presentStamp,
  StampNamedFaceValueError,
  StampPostalEntityError,
} from "@/lib/stampInventory";
import { validateNewStamp } from "@/lib/stampValidation";
import type { AuthenticatedUser } from "@/lib/auth";

async function authenticatedContext(authenticatedUser: AuthenticatedUser) {
  await authenticatedUser.getProfile();
  const { userId } = authenticatedUser;
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
  return withAuthenticatedUser(request, async (authenticatedUser) => {
    try {
      const { userId, activePostalEntitySetting } =
        await authenticatedContext(authenticatedUser);
      const stamps = await listStamps(userId, activePostalEntitySetting);
      return NextResponse.json({
        activeCountryCode:
          activePostalEntitySetting.postalEntity.countryCode,
        displayCurrencyCode:
          activePostalEntitySetting.displayCurrencyCode,
        stamps,
        inventoryTotal: calculateInventoryTotal(
          stamps,
          activePostalEntitySetting.displayCurrencyCode,
        ),
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
  return withAuthenticatedUser(request, async (authenticatedUser) => {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Request body must be valid JSON." },
        { status: 400 },
      );
    }
    const validation = validateNewStamp(body);
    if (validation.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    try {
      const { userId, activePostalEntitySetting } =
        await authenticatedContext(authenticatedUser);
      const created = await createStamp(userId, validation.data);
      const stamp = await presentStamp(
        created,
        activePostalEntitySetting,
      );
      const stamps = await listStamps(userId, activePostalEntitySetting);
      return NextResponse.json(
        {
          stamp,
          inventoryTotal: calculateInventoryTotal(
            stamps,
            activePostalEntitySetting.displayCurrencyCode,
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
      if (caught instanceof StampNamedFaceValueError) {
        return NextResponse.json(
          { errors: { namedFaceValueId: caught.message } },
          { status: 400 },
        );
      }
      throw caught;
    }
  });
}
