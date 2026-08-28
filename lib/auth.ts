import type { User } from "supertokens-node";
import supertokens from "supertokens-node";
import { withSession } from "supertokens-node/nextjs";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ensureSuperTokensInit } from "@/app/config/backend";
import type { UserProfile } from "@/lib/generated/prisma/client";
import {
  DEVELOPMENT_AUTH_COOKIE,
  developmentUser,
  isDevelopmentAuthEnabled,
} from "@/lib/developmentAuth";
import { upsertDevelopmentUserProfile } from "@/lib/developmentUserProfiles";
import { upsertUserProfile } from "@/lib/userProfile";

export type AuthenticatedUser = {
  userId: string;
  superTokensUser: User | undefined;
  isDevelopmentUser: boolean;
  getProfile: () => Promise<UserProfile>;
};

type AuthResponseOptions = {
  headers?: HeadersInit;
};

export function withAuthenticatedUser(
  request: NextRequest,
  handler: (user: AuthenticatedUser) => Promise<Response>,
  options: AuthResponseOptions = {},
) {
  if (isDevelopmentAuthEnabled()) {
    const selected = developmentUser(
      request.cookies.get(DEVELOPMENT_AUTH_COOKIE)?.value,
    );
    if (!selected) {
      return Promise.resolve(
        NextResponse.json(
          { error: "Select a local test user before continuing." },
          { status: 401, headers: options.headers },
        ),
      );
    }

    return handler({
      userId: selected.id,
      superTokensUser: undefined,
      isDevelopmentUser: true,
      getProfile: () => upsertDevelopmentUserProfile(selected),
    });
  }

  ensureSuperTokensInit();
  return withSession(request, async (error, session) => {
    if (error) {
      return NextResponse.json(error, {
        status: 500,
        headers: options.headers,
      });
    }
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401, headers: options.headers },
      );
    }

    const userId = session.getUserId();
    const superTokensUser = await supertokens.getUser(userId);
    return handler({
      userId,
      superTokensUser,
      isDevelopmentUser: false,
      getProfile: () =>
        upsertUserProfile(userId, superTokensUser?.emails[0] ?? null),
    });
  });
}
