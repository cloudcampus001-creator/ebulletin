import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getGradeGrid = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ classId: z.string().uuid(), sequenceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [subjRes, studRes, gradeRes] = await Promise.all([
      supabase.from("subjects").select("id, name, coefficient, display_order").eq("class_id", data.classId).order("display_order", { ascending: true }),
      supabase.from("students").select("id, matricule, last_name, first_name, sex").eq("class_id", data.classId).order("last_name", { ascending: true }),
      supabase.from("grades").select("student_id, subject_id, mark").eq("sequence_id", data.sequenceId),
    ]);
    if (subjRes.error) throw subjRes.error;
    if (studRes.error) throw studRes.error;
    if (gradeRes.error) throw gradeRes.error;
    const marks: Record<string, number | null> = {};
    (gradeRes.data ?? []).forEach((g) => {
      marks[`${g.student_id}:${g.subject_id}`] = g.mark == null ? null : Number(g.mark);
    });
    return {
      subjects: (subjRes.data ?? []).map((s) => ({ ...s, coefficient: Number(s.coefficient) })),
      students: studRes.data ?? [],
      marks,
    };
  });

export const saveGrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      schoolId: z.string().uuid(),
      sequenceId: z.string().uuid(),
      entries: z
        .array(
          z.object({
            studentId: z.string().uuid(),
            subjectId: z.string().uuid(),
            mark: z.number().min(0).max(100).nullable(),
          }),
        )
        .max(2000),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    if (data.entries.length === 0) return { saved: 0 };
    // Hardening: never trust the client-side max. FR schools are /20, EN /100.
    const { data: school, error: schoolError } = await context.supabase
      .from("schools")
      .select("subsystem")
      .eq("id", data.schoolId)
      .single();
    if (schoolError) throw schoolError;
    const maxMark = school.subsystem === "FR" ? 20 : 100;
    if (data.entries.some((e) => e.mark != null && e.mark > maxMark)) {
      throw new Error(`Marks must be between 0 and ${maxMark} for this school.`);
    }
    const payload = data.entries.map((e) => ({
      school_id: data.schoolId,
      sequence_id: data.sequenceId,
      student_id: e.studentId,
      subject_id: e.subjectId,
      mark: e.mark,
    }));
    const { error } = await context.supabase
      .from("grades")
      .upsert(payload, { onConflict: "student_id,subject_id,sequence_id" });
    if (error) throw error;
    return { saved: payload.length };
  });
