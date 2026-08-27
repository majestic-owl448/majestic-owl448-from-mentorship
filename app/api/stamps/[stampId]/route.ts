import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import {
  calculateInventoryTotal,
  deleteStamp,
  listStamps,
  presentStamp,
  StampNotFoundError,
  updateStamp,
} from "@/lib/stampInventory";
import { validateStampUpdate } from "@/lib/stampUpdateValidation";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ stampId: string }> },
) {
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
    const validation = validateStampUpdate(body);
    if (validation.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }

    try {
      const userId = session.getUserId();
      const user = await supertokens.getUser(userId);
      await upsertUserProfile(userId, user?.emails[0] ?? null);
      const activePostalEntitySetting =
        await requireActivePostalEntitySetting(userId);
      const { stampId } = await context.params;
      const updated = await updateStamp(
        userId,
        stampId,
        validation.data,
      );
      const stamp = await presentStamp(updated, activePostalEntitySetting);
      const stamps = await listStamps(userId, activePostalEntitySetting);

      return NextResponse.json({
        stamp,
        inventoryTotal: calculateInventoryTotal(
          stamps,
          activePostalEntitySetting.displayCurrencyCode,
        ),
      });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingRequiredError) {
        return NextResponse.json(
          { error: caught.message, settingsUrl: "/dashboard" },
          { status: 409 },
        );
      }
      if (caught instanceof StampNotFoundError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      throw caught;
    }
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ stampId: string }> },
) {
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
      const userId = session.getUserId();
      const user = await supertokens.getUser(userId);
      await upsertUserProfile(userId, user?.emails[0] ?? null);
      const activePostalEntitySetting =
        await requireActivePostalEntitySetting(userId);
      const { stampId } = await context.params;
      await deleteStamp(userId, stampId);
      const stamps = await listStamps(userId, activePostalEntitySetting);

      return NextResponse.json({
        deletedStampId: stampId,
        inventoryTotal: calculateInventoryTotal(
          stamps,
          activePostalEntitySetting.displayCurrencyCode,
        ),
      });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingRequiredError) {
        return NextResponse.json(
          { error: caught.message, settingsUrl: "/dashboard" },
          { status: 409 },
        );
      }
      if (caught instanceof StampNotFoundError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      throw caught;
    }
  });
}
