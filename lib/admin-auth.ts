import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { getPool } from "@/lib/db";
import mysql from "mysql2/promise";

const JWT_SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || "default_bnp_admin_session_secret_32_chars_min"
);

const COOKIE_NAME = "bnp_admin_session";

export interface AdminSession {
  email: string;
  role: "admin";
}

/**
 * Verifies admin credentials against the admins table or environment fallback.
 */
export async function verifyAdminCredentials(email: string, pass: string): Promise<boolean> {
  const normalizedEmail = email.trim().toLowerCase();

  // 1. Check database admins table if connected
  const p = getPool();
  if (p) {
    try {
      const [rows] = await p.execute<mysql.RowDataPacket[]>(
        "SELECT password_hash FROM admins WHERE email = ? LIMIT 1",
        [normalizedEmail]
      );
      if (rows.length > 0) {
        return bcrypt.compare(pass, rows[0].password_hash);
      }
    } catch (err) {
      console.warn("Could not query admins table:", err);
    }
  }

  // 2. Fallback to default admin in env
  const defaultEmail = (process.env.ADMIN_DEFAULT_EMAIL || "bikesnumberplate@gmail.com").toLowerCase();
  const defaultPass = process.env.ADMIN_DEFAULT_PASSWORD || "ChangeThisPassword123!";

  if (normalizedEmail === defaultEmail && pass === defaultPass) {
    return true;
  }

  return false;
}

/**
 * Creates a signed JWT session token.
 */
export async function createAdminToken(email: string): Promise<string> {
  return new SignJWT({ email, role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("24h")
    .sign(JWT_SECRET);
}

/**
 * Verifies an incoming session token.
 */
export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as AdminSession;
  } catch {
    return null;
  }
}

/**
 * Retrieves the active admin session from cookies.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export { COOKIE_NAME };
