import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listClasses = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ schoolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [clsRes, subjRes, studRes, asgRes] = await Promise.all([
      supabase.from("classes").select("id, name, level, stream, marksheet_token, created_at").eq("school_id", data.schoolId).order("created_at", { ascending: true }),
      supabase.from("subjects").select("id, class_id").eq("school_id", data.schoolId),
      supabase.from("students").select("id, class_id").eq("school_id", data.schoolId),
      supabase.from("teacher_assignments").select("id, class_id").eq("school_id", data.schoolId),
    ]);
    for (const result of [clsRes, subjRes, studRes, asgRes]) if (result.error) throw result.error;
    const subjCount = new Map<string, number>();
    (subjRes.data ?? []).forEach((s) => subjCount.set(s.class_id, (subjCount.get(s.class_id) ?? 0) + 1));
    const studCount = new Map<string, number>();
    (studRes.data ?? []).forEach((s) => studCount.set(s.class_id, (studCount.get(s.class_id) ?? 0) + 1));
    const asgCount = new Map<string, number>();
    (asgRes.data ?? []).forEach((a) => asgCount.set(a.class_id, (asgCount.get(a.class_id) ?? 0) + 1));
    return (clsRes.data ?? []).map((c) => ({
      ...c,
      subjectCount: subjCount.get(c.id) ?? 0,
      studentCount: studCount.get(c.id) ?? 0,
      teacherCount: asgCount.get(c.id) ?? 0,
    }));
  });

export const getClass = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ classId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cls, error } = await supabase
      .from("classes")
      .select("id, school_id, name, level, stream, marksheet_token")
      .eq("id", data.classId)
      .single();
    if (error || !cls) throw error ?? new Error("Class not found");
    const [subjRes, studRes, asgRes] = await Promise.all([
      supabase.from("subjects").select("id, name, coefficient, display_order").eq("class_id", cls.id).order("display_order", { ascending: true }),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("class_id", cls.id),
      supabase.from("teacher_assignments").select("id, teacher_id, subject_id, teachers(id, full_name, login_code, active), subjects(id, name)").eq("class_id", cls.id),
    ]);
    if (studRes.error) throw studRes.error;
    if (subjRes.error) throw subjRes.error;
    if (asgRes.error) throw asgRes.error;
    return {
      class: cls,
      subjects: subjRes.data ?? [],
      studentCount: studRes.count ?? 0,
      assignments: asgRes.data ?? [],
    };
  });

const classInput = z.object({
  schoolId: z.string().uuid(),
  name: z.string().trim().min(1).max(60),
  level: z.string().trim().min(1).max(60),
  stream: z.string().trim().max(60).optional(),
});

export const createClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => classInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: year, error: yearError } = await supabase
      .from("academic_years")
      .select("id")
      .eq("school_id", data.schoolId)
      .eq("is_current", true)
      .maybeSingle();
    if (yearError) throw yearError;
    const { data: created, error } = await supabase
      .from("classes")
      .insert({
        school_id: data.schoolId,
        academic_year_id: year?.id ?? null,
        name: data.name,
        level: data.level,
        stream: data.stream ?? null,
      })
      .select("id")
      .single();
    if (error) throw error;
    return { id: created.id };
  });

export const updateClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      classId: z.string().uuid(),
      name: z.string().trim().min(1).max(60),
      level: z.string().trim().min(1).max(60),
      stream: z.string().trim().max(60).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("classes")
      .update({ name: data.name, level: data.level, stream: data.stream ?? null })
      .eq("id", data.classId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });

export const deleteClass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ classId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("classes").delete().eq("id", data.classId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });

export const addSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      classId: z.string().uuid(),
      schoolId: z.string().uuid(),
      name: z.string().trim().min(1).max(80),
      coefficient: z.number().min(0).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error: classError } = await supabase.from("classes").select("id").eq("id", data.classId).eq("school_id", data.schoolId).single();
    if (classError) throw classError;
    const { count, error: countError } = await supabase.from("subjects").select("id", { count: "exact", head: true }).eq("class_id", data.classId);
    if (countError) throw countError;
    const { error } = await supabase.from("subjects").insert({
      class_id: data.classId,
      school_id: data.schoolId,
      name: data.name,
      coefficient: data.coefficient,
      display_order: count ?? 0,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updateSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      subjectId: z.string().uuid(),
      name: z.string().trim().min(1).max(80),
      coefficient: z.number().min(0).max(20),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("subjects")
      .update({ name: data.name, coefficient: data.coefficient })
      .eq("id", data.subjectId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ subjectId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("subjects").delete().eq("id", data.subjectId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });

export const regenerateMarksheetToken = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ classId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("classes")
      .update({ marksheet_token: crypto.randomUUID() })
      .eq("id", data.classId)
      .select("marksheet_token")
      .single();
    if (error) throw error;
    return { marksheet_token: updated.marksheet_token };
  });
