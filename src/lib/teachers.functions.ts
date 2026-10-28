import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listTeachers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ schoolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [tRes, aRes] = await Promise.all([
      supabase.from("teachers").select("id, full_name, login_code, active, created_at").eq("school_id", data.schoolId).order("full_name", { ascending: true }),
      supabase.from("teacher_assignments").select("id, teacher_id, class_id, subject_id, classes(name), subjects(name)").eq("school_id", data.schoolId),
    ]);
    if (tRes.error) throw tRes.error;
    if (aRes.error) throw aRes.error;
    return { teachers: tRes.data ?? [], assignments: aRes.data ?? [] };
  });

export const createTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(),
      full_name: z.string().trim().min(2).max(120),
      login_code: z.string().trim().min(3).max(40),
      password: z.string().min(4).max(72),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { hashPassword } = await import("./teacher-auth.server");
    const { error } = await context.supabase.from("teachers").insert({
      school_id: data.schoolId,
      full_name: data.full_name,
      login_code: data.login_code.toLowerCase(),
      password_hash: hashPassword(data.password),
    });
    if (error) {
      if (error.code === "23505") throw new Error("That login code is already used in this school.");
      throw error;
    }
    return { ok: true };
  });

export const updateTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      teacherId: z.string().uuid(),
      full_name: z.string().trim().min(2).max(120),
      login_code: z.string().trim().min(3).max(40),
      active: z.boolean(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: changed, error } = await context.supabase
      .from("teachers")
      .update({ full_name: data.full_name, login_code: data.login_code.toLowerCase(), active: data.active })
      .eq("id", data.teacherId).select("id").single();
    if (error) {
      if (error.code === "23505") throw new Error("That login code is already used in this school.");
      throw error;
    }
    return { ok: true };
  });

export const resetTeacherPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ teacherId: z.string().uuid(), password: z.string().min(4).max(72) }).parse(d))
  .handler(async ({ data, context }) => {
    const { hashPassword } = await import("./teacher-auth.server");
    const { data: changed, error } = await context.supabase
      .from("teachers")
      .update({ password_hash: hashPassword(data.password) })
      .eq("id", data.teacherId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });

export const deleteTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ teacherId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: changed, error } = await context.supabase.from("teachers").delete().eq("id", data.teacherId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });

export const assignTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(),
      teacherId: z.string().uuid(),
      classId: z.string().uuid(),
      subjectId: z.string().uuid(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const [teacher, cls, subject] = await Promise.all([
      context.supabase.from("teachers").select("id").eq("id", data.teacherId).eq("school_id", data.schoolId).single(),
      context.supabase.from("classes").select("id").eq("id", data.classId).eq("school_id", data.schoolId).single(),
      context.supabase.from("subjects").select("id").eq("id", data.subjectId).eq("class_id", data.classId).eq("school_id", data.schoolId).single(),
    ]);
    for (const result of [teacher, cls, subject]) if (result.error) throw result.error;
    const { error } = await context.supabase.from("teacher_assignments").insert({
      school_id: data.schoolId,
      teacher_id: data.teacherId,
      class_id: data.classId,
      subject_id: data.subjectId,
    });
    if (error) {
      if (error.code === "23505") throw new Error("This teacher is already assigned to that subject.");
      throw error;
    }
    return { ok: true };
  });

export const unassignTeacher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ assignmentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("teacher_assignments").delete().eq("id", data.assignmentId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });
