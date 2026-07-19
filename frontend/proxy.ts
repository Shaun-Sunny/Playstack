import { NextRequest, NextResponse } from "next/server";

const COMMON_AUTH_COOKIE_NAMES = ["auth_token", "access_token", "token", "jwt"];

function hasAuthCookie(request: NextRequest) {
  const explicitCookieName = process.env.AUTH_COOKIE_NAME;

  if (explicitCookieName && request.cookies.get(explicitCookieName)) {
    return true;
  }

  return COMMON_AUTH_COOKIE_NAMES.some((cookieName) => request.cookies.get(cookieName));
}

export function proxy(request: NextRequest) {
  if (hasAuthCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/employees",
    "/employees/:path*",
    "/organization",
    "/organization/:path*",
  ],
};