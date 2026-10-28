// Server-only helpers for the teacher QR marksheet flow.
// Teachers are NOT Supabase auth users; they log in with a name/login-code + password.
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import { useSession } from "@tanstack/react-start/server";
export { hashPassword, verifyPassword } from "./teacher-password";

export interface TeacherSessionData {
  teacherId?: string;
  schoolId?: string;
  classId?: string;
  fullName?: string;
}

function sessionPassword(): string {
  const secret = process.env['TEACHER_SESSION_SECRET'];
  if (!secret) throw new Error("TEACHER_SESSION_SECRET is not configured");
  // useSession requires a 32+ char password; hash to guarantee length.
  return bytesToHex(sha256(new TextEncoder().encode(secret)));
}

export function getTeacherSession() {
  return useSession<TeacherSessionData>({
    password: sessionPassword(),
    name: "edubulletin-teacher",
    maxAge: 60 * 60 * 8, // 8 hours
    cookie: { httpOnly: true, secure: true, sameSite: "lax", path: "/" },
  });
}
