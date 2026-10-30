// Teacher QR marksheet flow. Teachers are NOT Supabase auth users.
// All DB access here uses the service-role client (bypasses RLS) but every
// action is gated by the encrypted teacher session + per-assignment checks,
// so a teacher can only ever touch their own class/subject for the open sequence.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { validateRosterEntries } from "./mark-validation";

async function loadOpenSequence(admin: any, schoolId: string) {
  const { data, error } = await admin
    .from("sequences")
    .select("id, index, name, status, terms(index, name)")
    .eq("school_id", schoolId)
    .eq("status", "open")
    .order("index", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// PUBLIC: landing info from QR token (no sensitive data).
export const marksheetInfo = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: cls, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, name, level, stream, school_id, schools(name, logo_url, subsystem)")
      .eq("marksheet_token", data.token)
      .maybeSingle();
    if (classError) throw classError;
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

    const genericError = new Error("Incorrect name/login code or password.");
    const { data: cls, error: classError } = await supabaseAdmin
      .from("classes")
      .select("id, name, school_id")
      .eq("marksheet_token", data.token)
      .maybeSingle();
    if (classError) throw classError;
    if (!cls) {
      throw new Error("Invalid QR code.");
    }

    const loginCode = data.login_code.toLowerCase();
    const { data: limit, error: limitError } = await supabaseAdmin.from("teacher_login_limits")
      .select("locked_until").eq("school_id", cls.school_id).eq("login_code", loginCode).maybeSingle();
    if (limitError) throw limitError;
    if (limit?.locked_until && Date.parse(limit.locked_until) > Date.now()) {
      throw new Error("Too many attempts. Please wait 15 minutes and try again.");
    }
    const { data: teacher, error: teacherError } = await supabaseAdmin
      .from("teachers")
      .select("id, full_name, password_hash, active, school_id")
      .eq("school_id", cls.school_id)
      .eq("login_code", data.login_code.toLowerCase())
      .maybeSingle();
    if (teacherError) throw teacherError;
    if (!teacher || !teacher.active || !verifyPassword(data.password, teacher.password_hash)) {
      const { error } = await supabaseAdmin.rpc("record_teacher_login_failure", { p_school_id: cls.school_id, p_login_code: loginCode });
      if (error) throw error;
      throw genericError;
    }
    const { error: clearError } = await supabaseAdmin.from("teacher_login_limits").delete()
      .eq("school_id", cls.school_id).eq("login_code", loginCode);
    if (clearError) throw clearError;

    // Subjects this teacher is assigned to *in this class*.
    const { data: asgs, error: assignmentError } = await supabaseAdmin
      .from("teacher_assignments")
      .select("subject_id, subjects(id, name, coefficient)")
      .eq("class_id", cls.id)
      .eq("teacher_id", teacher.id);
    if (assignmentError) throw assignmentError;
    const subjects = (asgs ?? []).filter((a) => a.subjects).map((a: any) => ({
      id: a.subjects.id,
      name: a.subjects.name,
      coefficient: Number(a.subjects.coefficient),
    }));
    if (subjects.length === 0) throw new Error("You are not assigned to any subject in this class.");

    const session = await getTeacherSession();
    await session.update({ teacherId: teacher.id, schoolId: cls.school_id, classId: cls.id, fullName: teacher.full_name });

    return { fullName: teacher.full_name, className: cls.name, subjects };
  });

export const teacherSession = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { getTeacherSession } = await import("@/lib/teacher-auth.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const session = await getTeacherSession();
    const d = session.data;
    if (!d.teacherId || !d.classId || !d.schoolId) return { authenticated: false as const };
    const [cls, teacher, assignments] = await Promise.all([
      supabaseAdmin.from("classes").select("id").eq("id", d.classId).eq("marksheet_token", data.token).maybeSingle(),
      supabaseAdmin.from("teachers").select("id, full_name").eq("id", d.teacherId).eq("school_id", d.schoolId).eq("active", true).maybeSingle(),
      supabaseAdmin.from("teacher_assignments").select("subjects(id, name, coefficient)").eq("teacher_id", d.teacherId).eq("class_id", d.classId).eq("school_id", d.schoolId),
    ]);
    for (const result of [cls, teacher, assignments]) if (result.error) throw result.error;
    if (!cls.data || !teacher.data) return { authenticated: false as const };
    return { authenticated: true as const, fullName: teacher.data.full_name, classId: d.classId,
      subjects: (assignments.data ?? []).flatMap((a) => a.subjects ? [{ ...a.subjects, coefficient: Number(a.subjects.coefficient) }] : []) };
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
  const { data: teacher, error: teacherError } = await admin.from("teachers").select("id")
    .eq("id", d.teacherId).eq("school_id", d.schoolId).eq("active", true).maybeSingle();
  if (teacherError) throw teacherError;
  if (!teacher) throw new Error("Your teacher account is inactive. Contact the administration.");
  const { data: asg, error: assignmentError } = await admin
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", d.teacherId)
    .eq("class_id", d.classId)
    .eq("subject_id", subjectId)
    .eq("school_id", d.schoolId)
    .maybeSingle();
  if (assignmentError) throw assignmentError;
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
    for (const result of [studRes, subjRes, gradeRes]) if (result.error) throw result.error;
    if (!subjRes.data) throw new Error("Subject not found. Refresh and try again.");
    const marks: Record<string, number | null> = {};
    (gradeRes.data ?? []).forEach((g: any) => { marks[g.student_id] = g.mark == null ? null : Number(g.mark); });
    const { data: school, error: schoolError } = await supabaseAdmin.from("schools").select("subsystem").eq("id", d.schoolId).single();
    if (schoolError) throw schoolError;
    if (!school) throw new Error("School not found.");
    return {
      students: studRes.data ?? [],
      subject: { id: subjRes.data.id, name: subjRes.data.name, coefficient: Number(subjRes.data.coefficient) },
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
        .array(z.object({ studentId: z.string().uuid(), mark: z.number().min(0).max(20).nullable() }))
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
    const { data: school, error: schoolError } = await supabaseAdmin
      .from("schools")
      .select("subsystem")
      .eq("id", d.schoolId)
      .single();
    if (schoolError) throw schoolError;
    if (!school) throw new Error("School not found.");
    const maxMark = 20;
    const { data: roster, error: rosterError } = await supabaseAdmin.from("students").select("id")
      .eq("class_id", d.classId).eq("school_id", d.schoolId);
    if (rosterError) throw rosterError;
    validateRosterEntries(data.entries, new Set((roster ?? []).map((s) => s.id)), maxMark);
    const payload = data.entries.map((e) => ({
      school_id: d.schoolId,
      sequence_id: seq.id,
      student_id: e.studentId,
      subject_id: data.subjectId,
      mark: e.mark,
      entered_by_teacher_id: d.teacherId,
    }));
    const { error } = await supabaseAdmin.from("grades").upsert(payload, { onConflict: "student_id,subject_id,sequence_id" });
    if (error) throw error;
    return { saved: payload.length };
  });
