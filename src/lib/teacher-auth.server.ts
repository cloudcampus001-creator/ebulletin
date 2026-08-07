// Server-only helpers for the teacher QR marksheet flow.
// Teachers are NOT Supabase auth users; they log in with a name/login-code + password.
import { pbkdf2Sync, randomBytes, timingSafeEqual, createHash } from "node:crypto";
import { useSession } from "@tanstack/react-start/server";

const ITERATIONS = 120_000;
const KEYLEN = 32;
const DIGEST = "sha256";

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(plain, salt, ITERATIONS, KEYLEN, DIGEST).toString("hex");
  return `pbkdf2$${ITERATIONS}$${salt}$${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [scheme, iterStr, salt, hash] = stored.split("$");
    if (scheme !== "pbkdf2" || !iterStr || !salt || !hash) return false;
    const iterations = parseInt(iterStr, 10);
    const computed = pbkdf2Sync(plain, salt, iterations, KEYLEN, DIGEST);
    const expected = Buffer.from(hash, "hex");
    if (computed.length !== expected.length) return false;
    return timingSafeEqual(computed, expected);
  } catch {
    return false;
  }
}

export interface TeacherSessionData {
  teacherId?: string;
  schoolId?: string;
  classId?: string;
  fullName?: string;
}

function sessionPassword(): string {
  const secret = process.env.TEACHER_SESSION_SECRET;
  if (!secret) throw new Error("TEACHER_SESSION_SECRET is not configured");
  // useSession requires a 32+ char password; hash to guarantee length.
  return createHash("sha256").update(secret).digest("hex");
}

export function getTeacherSession() {
  return useSession<TeacherSessionData>({
    password: sessionPassword(),
    name: "edubulletin-teacher",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}
