import { NextRequest, NextResponse } from "next/server";
import { withAuthenticatedUser } from "@/lib/auth";
import {
  AccountDeletionIncompleteError,
  deleteAccount,
} from "@/lib/accountDeletion";

const developmentIdentityDeletion = {
  revokeSessions: async () => undefined,
  deleteIdentity: async () => undefined,
};

export async function DELETE(request: NextRequest) {
  return withAuthenticatedUser(
    request,
    async ({ userId, isDevelopmentUser, getProfile }) => {
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
      await getProfile();

      try {
        if (isDevelopmentUser) {
          await deleteAccount(userId, developmentIdentityDeletion);
        } else {
          await deleteAccount(userId);
        }
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
    },
  );
}
