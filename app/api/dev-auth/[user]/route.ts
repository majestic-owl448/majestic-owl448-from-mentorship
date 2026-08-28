import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  DEVELOPMENT_AUTH_COOKIE,
  developmentUser,
  isDevelopmentAuthEnabled,
} from "@/lib/developmentAuth";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ user: string }> },
) {
  if (!isDevelopmentAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { user } = await context.params;
  if (!developmentUser(user)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(DEVELOPMENT_AUTH_COOKIE, user, {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
  });
  return response;
}
