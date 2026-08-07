import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const listStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ classId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("students")
      .select("id, matricule, last_name, first_name, sex, date_of_birth")
      .eq("class_id", data.classId)
      .order("last_name", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

const studentInput = z.object({
  classId: z.string().uuid(),
  schoolId: z.string().uuid(),
  matricule: z.string().trim().max(40).optional(),
  last_name: z.string().trim().min(1).max(80),
  first_name: z.string().trim().min(1).max(80),
  sex: z.enum(["M", "F"]).optional(),
  date_of_birth: z.string().trim().max(20).optional(),
});

export const addStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => studentInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").insert({
      class_id: data.classId,
      school_id: data.schoolId,
      matricule: data.matricule || null,
      last_name: data.last_name,
      first_name: data.first_name,
      sex: data.sex ?? null,
      date_of_birth: data.date_of_birth || null,
    });
    if (error) throw error;
    return { ok: true };
  });

export const updateStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      studentId: z.string().uuid(),
      matricule: z.string().trim().max(40).optional(),
      last_name: z.string().trim().min(1).max(80),
      first_name: z.string().trim().min(1).max(80),
      sex: z.enum(["M", "F"]).optional(),
      date_of_birth: z.string().trim().max(20).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("students")
      .update({
        matricule: data.matricule || null,
        last_name: data.last_name,
        first_name: data.first_name,
        sex: data.sex ?? null,
        date_of_birth: data.date_of_birth || null,
      })
      .eq("id", data.studentId);
    if (error) throw error;
    return { ok: true };
  });

export const deleteStudent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ studentId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("students").delete().eq("id", data.studentId);
    if (error) throw error;
    return { ok: true };
  });

export const importStudents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      classId: z.string().uuid(),
      schoolId: z.string().uuid(),
      rows: z
        .array(
          z.object({
            matricule: z.string().trim().max(40).optional(),
            last_name: z.string().trim().min(1).max(80),
            first_name: z.string().trim().min(1).max(80),
            sex: z.enum(["M", "F"]).optional(),
            date_of_birth: z.string().trim().max(20).optional(),
          }),
        )
        .min(1)
        .max(500),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const payload = data.rows.map((r) => ({
      class_id: data.classId,
      school_id: data.schoolId,
      matricule: r.matricule || null,
      last_name: r.last_name,
      first_name: r.first_name,
      sex: r.sex ?? null,
      date_of_birth: r.date_of_birth || null,
    }));
    const { error } = await context.supabase.from("students").insert(payload);
    if (error) throw error;
    return { inserted: payload.length };
  });
