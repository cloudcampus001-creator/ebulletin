// Teacher QR marksheet flow. Teachers are NOT Supabase auth users.
// All DB access here uses the service-role client (bypasses RLS) but every
// action is gated by the encrypted teacher session + per-assignment checks,
// so a teacher can only ever touch their own class/subject for the open sequence.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Hardening: throttle teacher login-code + password guessing.
// 8 failures for the same login code within 15 minutes locks that code for 15 minutes.
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_FAILURES = 8;
const loginAttempts = new Map<string, { failures: number; firstAt: number; lockedUntil: number }>();

function loginThrottleKey(token: string, loginCode: string) {
  return `${token}:${loginCode.trim().toLowerCase()}`;
}

function isLoginLocked(key: string) {
  const rec = loginAttempts.get(key);
  if (!rec) return false;
  const now = Date.now();
  if (rec.lockedUntil > now) return true;
  if (now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.delete(key);
    return false;
  }
  return false;
}

function recordLoginFailure(key: string) {
  const now = Date.now();
  const rec = loginAttempts.get(key);
  if (!rec || now - rec.firstAt > LOGIN_WINDOW_MS) {
    loginAttempts.set(key, { failures: 1, firstAt: now, lockedUntil: 0 });
    return;
  }
  rec.failures += 1;
  if (rec.failures >= LOGIN_MAX_FAILURES) rec.lockedUntil = now + LOGIN_WINDOW_MS;
}

function clearLoginFailures(key: string) {
  loginAttempts.delete(key);
}

async function loadOpenSequence(admin: any, schoolId: string) {
  const { data } = await admin
    .from("sequences")
    .select("id, index, name, status, terms(index, name)")
    .eq("school_id", schoolId)
    .eq("status", "open")
    .order("index", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data;
}

// PUBLIC: landing info from QR token (no sensitive data).
export const marksheetInfo = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cls } = await supabaseAdmin
      .from("classes")
      .select("id, name, level, stream, school_id, schools(name, logo_url, subsystem)")
      .eq("marksheet_token", data.token)
      .maybeSingle();
    if (!cls) throw new Error("Invalid or expired QR code.");
    const school = (cls as any).schools;
    const seq = await loadOpenSequence(supabaseAdmin, cls.school_id);
    return {
      class: { id: cls.id, name: cls.name, level: cls.level, stream: cls.stream },
      school: { name: school?.name ?? "School", logo_url: school?.logo_url ?? null, subsystem: school?.subsystem ?? "EN" },
      openSequence: seq ? { name: seq.name, term: (seq as any).terms?.name ?? null } : null,
    };
  });

// PUBLIC: log a teacher in for a given class token.
export const teacherLogin = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      token: z.string().uuid(),
      login_code: z.string().trim().min(1).max(40),
      password: z.string().min(1).max(72),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { verifyPassword, getTeacherSession } = await import("@/lib/teacher-auth.server");

    const throttleKey = loginThrottleKey(data.token, data.login_code);
    // Generic message either way — never reveal whether the login code exists.
    const genericError = new Error("Incorrect name/login code or password.");
    if (isLoginLocked(throttleKey)) {
      throw new Error("Too many attempts. Please wait 15 minutes and try again.");
    }

    const { data: cls } = await supabaseAdmin
      .from("classes")
      .select("id, name, school_id")
      .eq("marksheet_token", data.token)
      .maybeSingle();
    if (!cls) {
      recordLoginFailure(throttleKey);
      throw new Error("Invalid QR code.");
    }

    const { data: teacher } = await supabaseAdmin
      .from("teachers")
      .select("id, full_name, password_hash, active, school_id")
      .eq("school_id", cls.school_id)
      .eq("login_code", data.login_code.toLowerCase())
      .maybeSingle();
    if (!teacher || !teacher.active || !verifyPassword(data.password, teacher.password_hash)) {
      recordLoginFailure(throttleKey);
      throw genericError;
    }
    clearLoginFailures(throttleKey);

    // Subjects this teacher is assigned to *in this class*.
    const { data: asgs } = await supabaseAdmin
      .from("teacher_assignments")
      .select("subject_id, subjects(id, name, coefficient)")
      .eq("class_id", cls.id)
      .eq("teacher_id", teacher.id);
    const subjects = (asgs ?? []).map((a: any) => ({
      id: a.subjects.id,
      name: a.subjects.name,
      coefficient: Number(a.subjects.coefficient),
    }));
    if (subjects.length === 0) throw new Error("You are not assigned to any subject in this class.");

    const session = await getTeacherSession();
    await session.update({ teacherId: teacher.id, schoolId: cls.school_id, classId: cls.id, fullName: teacher.full_name });

    return { fullName: teacher.full_name, className: cls.name, subjects };
  });

export const teacherSession = createServerFn({ method: "GET" }).handler(async () => {
  const { getTeacherSession } = await import("@/lib/teacher-auth.server");
  const session = await getTeacherSession();
  const d = session.data;
  if (!d.teacherId || !d.classId) return { authenticated: false as const };
  return { authenticated: true as const, fullName: d.fullName ?? "", classId: d.classId };
});

export const teacherLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { getTeacherSession } = await import("@/lib/teacher-auth.server");
  const session = await getTeacherSession();
  await session.clear();
  return { ok: true };
});

async function requireAssignment(admin: any, session: any, subjectId: string) {
  const d = session.data;
  if (!d.teacherId || !d.classId || !d.schoolId) throw new Error("Your session expired. Please scan and log in again.");
  const { data: asg } = await admin
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", d.teacherId)
    .eq("class_id", d.classId)
    .eq("subject_id", subjectId)
    .maybeSingle();
  if (!asg) throw new Error("You are not allowed to enter marks for this subject.");
  const seq = await loadOpenSequence(admin, d.schoolId);
  if (!seq) throw new Error("No sequence is currently open. Ask the administration to open one.");
  return { d, seq };
}

// Roster + existing marks for the open sequence.
export const marksheetRoster = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ subjectId: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTeacherSession } = await import("@/lib/teacher-auth.server");
    const session = await getTeacherSession();
    const { d, seq } = await requireAssignment(supabaseAdmin, session, data.subjectId);

    const [studRes, subjRes, gradeRes] = await Promise.all([
      supabaseAdmin.from("students").select("id, matricule, last_name, first_name, sex").eq("class_id", d.classId).order("last_name", { ascending: true }),
      supabaseAdmin.from("subjects").select("id, name, coefficient").eq("id", data.subjectId).single(),
      supabaseAdmin.from("grades").select("student_id, mark").eq("sequence_id", seq.id).eq("subject_id", data.subjectId),
    ]);
    const marks: Record<string, number | null> = {};
    (gradeRes.data ?? []).forEach((g: any) => { marks[g.student_id] = g.mark == null ? null : Number(g.mark); });
    const { data: school } = await supabaseAdmin.from("schools").select("subsystem").eq("id", d.schoolId).single();
    return {
      students: studRes.data ?? [],
      subject: { id: subjRes.data!.id, name: subjRes.data!.name, coefficient: Number(subjRes.data!.coefficient) },
      sequence: { id: seq.id, name: seq.name },
      subsystem: school?.subsystem ?? "EN",
      marks,
    };
  });

export const saveMarksheet = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({
      subjectId: z.string().uuid(),
      entries: z
        .array(z.object({ studentId: z.string().uuid(), mark: z.number().min(0).max(100).nullable() }))
        .max(2000),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getTeacherSession } = await import("@/lib/teacher-auth.server");
    const session = await getTeacherSession();
    const { d, seq } = await requireAssignment(supabaseAdmin, session, data.subjectId);
    if (data.entries.length === 0) return { saved: 0 };
    // Hardening: enforce the school's subsystem cap server-side (FR /20, EN /100).
    const { data: school } = await supabaseAdmin
      .from("schools")
      .select("subsystem")
      .eq("id", d.schoolId!)
      .single();
    const maxMark = school?.subsystem === "FR" ? 20 : 100;
    if (data.entries.some((e) => e.mark != null && e.mark > maxMark)) {
      throw new Error(`Marks must be between 0 and ${maxMark}.`);
    }
    const payload = data.entries.map((e) => ({
      school_id: d.schoolId!,
      sequence_id: seq.id,
      student_id: e.studentId,
      subject_id: data.subjectId,
      mark: e.mark,
      entered_by_teacher_id: d.teacherId!,
    }));
    const { error } = await supabaseAdmin.from("grades").upsert(payload, { onConflict: "student_id,subject_id,sequence_id" });
    if (error) throw error;
    return { saved: payload.length };
  });
