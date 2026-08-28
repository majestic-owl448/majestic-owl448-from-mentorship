import { NextRequest, NextResponse } from "next/server";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import { prisma } from "@/lib/db";
import {
  PostalEntitySettingAlreadyExistsError,
  PostalEntitySettingNotFoundError,
  PostalEntityUnavailableError,
  replaceRejectedPostalEntity,
  type PostalEntitySubmissionInput,
} from "@/lib/postalEntitySettings";
import { validatePostalEntitySubmission } from "@/lib/postalEntitySettingValidation";

ensureSuperTokensInit();

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ settingId: string }> },
) {
  return withSession(request, async (error, session) => {
    if (error) return NextResponse.json(error, { status: 500 });
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
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
    const record = typeof body === "object" && body !== null
      ? body as Record<string, unknown>
      : {};
    const postalEntityId = typeof record.postalEntityId === "string"
      ? record.postalEntityId.trim()
      : "";
    const validation = postalEntityId ? null : validatePostalEntitySubmission(record);
    if (validation?.errors) {
      return NextResponse.json({ errors: validation.errors }, { status: 400 });
    }
    try {
      const { settingId } = await context.params;
      const postalEntitySetting = await replaceRejectedPostalEntity(
        session.getUserId(),
        settingId,
        postalEntityId
          ? { postalEntityId }
          : { submission: validation!.data as PostalEntitySubmissionInput },
      );
      const profile = await prisma.userProfile.findUnique({
        where: { id: session.getUserId() },
        select: { activePostalEntitySettingId: true },
      });
      return NextResponse.json({
        postalEntitySetting,
        isActive: profile?.activePostalEntitySettingId === postalEntitySetting.id,
      });
    } catch (caught) {
      if (caught instanceof PostalEntitySettingNotFoundError) {
        return NextResponse.json({ error: caught.message }, { status: 404 });
      }
      if (caught instanceof PostalEntityUnavailableError) {
        return NextResponse.json({ error: caught.message }, { status: 400 });
      }
      if (caught instanceof PostalEntitySettingAlreadyExistsError) {
        return NextResponse.json({ error: caught.message }, { status: 409 });
      }
      throw caught;
    }
  });
}
