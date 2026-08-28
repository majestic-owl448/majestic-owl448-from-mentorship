import { NextResponse } from "next/server";
import {
  DEVELOPMENT_AUTH_COOKIE,
  isDevelopmentAuthEnabled,
} from "@/lib/developmentAuth";

export async function POST() {
  if (!isDevelopmentAuthEnabled()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const response = NextResponse.json({ signedOut: true });
  response.cookies.set(DEVELOPMENT_AUTH_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  });
  return response;
}
