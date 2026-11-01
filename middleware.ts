import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "default_bnp_admin_session_secret_32_chars_min"
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Only protect /admin routes
  if (pathname.startsWith("/admin")) {
    // Allow login page through
    if (pathname === "/admin/login") {
      return NextResponse.next();
    }

    const token = req.cookies.get("bnp_admin_session")?.value;

    if (!token) {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, JWT_SECRET);
      return NextResponse.next();
    } catch {
      const loginUrl = new URL("/admin/login", req.url);
      loginUrl.searchParams.set("from", pathname);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete("bnp_admin_session");
      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
