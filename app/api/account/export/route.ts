import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import { createAccountDataExport } from "@/lib/accountDataExport";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, { status: 500, headers: privateHeaders });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: privateHeaders },
      );
    }

    const userId = session.getUserId();
    const requestedUserId = request.nextUrl.searchParams.get("userId");
    if (requestedUserId && requestedUserId !== userId) {
      return NextResponse.json(
        { error: "Export not found" },
        { status: 404, headers: privateHeaders },
      );
    }

    const user = await supertokens.getUser(userId);
    await upsertUserProfile(userId, user?.emails[0] ?? null);
    const generatedAt = new Date();
    const document = await createAccountDataExport(userId, user, generatedAt);
    const filename = `stamp-inventory-export-${generatedAt.toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(document, null, 2), {
      headers: {
        ...privateHeaders,
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  });
}
