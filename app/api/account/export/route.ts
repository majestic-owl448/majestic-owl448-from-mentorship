import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import { createAccountDataExport } from "@/lib/accountDataExport";

const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  Expires: "0",
};

export async function GET(request: NextRequest) {
  return withAuthenticatedUser(
    request,
    async ({ userId, superTokensUser, getProfile }) => {
      const requestedUserId = request.nextUrl.searchParams.get("userId");
      if (requestedUserId && requestedUserId !== userId) {
        return NextResponse.json(
          { error: "Export not found" },
          { status: 404, headers: privateHeaders },
        );
      }
      await getProfile();

      const generatedAt = new Date();
      const document = await createAccountDataExport(
        userId,
        superTokensUser,
        generatedAt,
      );
      const filename = `stamp-inventory-export-${generatedAt.toISOString().slice(0, 10)}.json`;

      return new NextResponse(JSON.stringify(document, null, 2), {
        headers: {
          ...privateHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    },
    { headers: privateHeaders },
  );
}
