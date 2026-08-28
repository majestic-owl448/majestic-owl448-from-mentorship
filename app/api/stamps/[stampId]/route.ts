import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  PostalEntitySettingRequiredError,
  requireActivePostalEntitySetting,
} from "@/lib/postalEntitySettings";
import {
  calculateInventoryTotal,
  deleteStamp,
  listStamps,
  presentStamp,
  StampActionError,
  StampNotFoundError,
  updateStamp,
} from "@/lib/stampInventory";
import { validateStampUpdate } from "@/lib/stampUpdateValidation";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ stampId: string }> },
) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
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
      await getProfile();
      const activePostalEntitySetting =
        await requireActivePostalEntitySetting(userId);
      const { stampId } = await context.params;
      const updated = await updateStamp(
        userId,
        stampId,
        validation.data,
        activePostalEntitySetting,
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
      if (caught instanceof StampActionError) {
        return NextResponse.json(
          { errors: { actionResolution: caught.message } },
          { status: 400 },
        );
      }
      throw caught;
    }
  });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ stampId: string }> },
) {
  return withAuthenticatedUser(request, async ({ userId, getProfile }) => {
    try {
      await getProfile();
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
