import { NextRequest, NextResponse } from "next/server";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import { ensureSuperTokensInit } from "@/app/config/backend";
import {
  AccountDeletionIncompleteError,
  deleteAccount,
} from "@/lib/accountDeletion";
import { upsertUserProfile } from "@/lib/userProfile";

ensureSuperTokensInit();

export async function DELETE(request: NextRequest) {
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
    if (
      typeof body !== "object" ||
      body === null ||
      (body as Record<string, unknown>).confirmation !== "DELETE"
    ) {
      return NextResponse.json(
        { error: "Type DELETE to confirm permanent account deletion." },
        { status: 400 },
      );
    }

    const userId = session.getUserId();
    const user = await supertokens.getUser(userId);
    await upsertUserProfile(userId, user?.emails[0] ?? null);

    try {
      await deleteAccount(userId);
      return NextResponse.json({ deleted: true });
    } catch (caught) {
      if (caught instanceof AccountDeletionIncompleteError) {
        return NextResponse.json(
          {
            error:
              "Account deletion is still in progress. Access remains blocked while the deletion is retried.",
          },
          { status: 503, headers: { "Retry-After": "60" } },
        );
      }
      throw caught;
    }
  });
}
