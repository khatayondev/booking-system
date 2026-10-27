import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "aura_session";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Protect /api/admin/*
  if (pathname.startsWith("/api/admin")) {
    if (!sessionCookie) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "Authentication required to access admin API",
          },
        },
        { status: 401 }
      );
    }
  }

  // Protect /dashboard, /services, /settings, /appointments, /pos, /staff, /reports, /audit, /customers
  const protectedPrefixes = ["/dashboard", "/services", "/settings", "/appointments", "/pos", "/staff", "/reports", "/audit", "/customers"];
  const isProtectedPath = protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (isProtectedPath) {
    if (!sessionCookie) {
      const redirectUrl = new URL("/login", request.url);
      const target = pathname + (search || "");
      if (target !== "/dashboard") {
        redirectUrl.searchParams.set("redirect", target);
      }
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/services",
    "/services/:path*",
    "/settings",
    "/settings/:path*",
    "/staff",
    "/staff/:path*",
    "/api/admin/:path*",
  ],
};
