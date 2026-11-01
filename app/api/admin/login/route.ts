import { NextRequest, NextResponse } from "next/server";
import { verifyAdminCredentials, createAdminToken, COOKIE_NAME } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const isValid = await verifyAdminCredentials(email, password);
    if (!isValid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await createAdminToken(email);

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
