import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { presetSubjects, type SubjectDefault } from "@/lib/defaults";
import { defaultBands, termLabel, sequenceLabel, type Subsystem } from "@/lib/grading";

export const listMySchools = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("school_members")
      .select("role, school:schools(id, name, subsystem, logo_url, address, motto)")
      .eq("user_id", userId);
    if (error) throw error;
    return (data ?? []).map((r) => ({ role: r.role, ...(r.school as any) }));
  });

const createSchoolInput = z.object({
  name: z.string().trim().min(2).max(150),
  subsystem: z.enum(["FR", "EN"]),
  address: z.string().trim().max(300).optional(),
  motto: z.string().trim().max(200).optional(),
  yearLabel: z.string().trim().min(4).max(30),
  classes: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(60),
        level: z.string().trim().min(1).max(60),
        stream: z.string().trim().max(60).optional(),
        presetKey: z.string().min(1),
      }),
    )
    .min(1)
    .max(20),
});

export const createSchool = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchoolInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const subsystem = data.subsystem as Subsystem;

    // 1. Create school
    const { data: school, error: schoolErr } = await supabase
      .from("schools")
      .insert({
        name: data.name,
        subsystem,
        address: data.address ?? null,
        motto: data.motto ?? null,
        language_default: subsystem === "FR" ? "fr" : "en",
        grade_bands: defaultBands(subsystem) as unknown as never,
        created_by: userId,
      })
      .select("id")
      .single();
    if (schoolErr || !school) throw schoolErr ?? new Error("Failed to create school");
    const schoolId = school.id;

    // 2. Make creator an admin member
    const { error: memberErr } = await supabase
      .from("school_members")
      .insert({ school_id: schoolId, user_id: userId, role: "admin" });
    if (memberErr) throw memberErr;

    // 3. Academic year + 3 terms
    const { data: year, error: yearErr } = await supabase
      .from("academic_years")
      .insert({ school_id: schoolId, label: data.yearLabel, is_current: true })
      .select("id")
      .single();
    if (yearErr || !year) throw yearErr ?? new Error("Failed to create academic year");

    const { data: terms, error: termsErr } = await supabase
      .from("terms")
      .insert(
        [1, 2, 3].map((i) => ({
          academic_year_id: year.id,
          school_id: schoolId,
          index: i,
          name: termLabel(subsystem, i),
        })),
      )
      .select("id, index");
    if (termsErr || !terms) throw termsErr ?? new Error("Failed to create terms");

    // 3b. Two sequences per term (6 total). First sequence opens by default.
    const sequenceRows = terms
      .sort((a, b) => a.index - b.index)
      .flatMap((t) =>
        [0, 1].map((offset) => {
          const globalIndex = (t.index - 1) * 2 + offset + 1;
          return {
            school_id: schoolId,
            academic_year_id: year.id,
            term_id: t.id,
            index: globalIndex,
            name: sequenceLabel(subsystem, globalIndex),
            status: globalIndex === 1 ? ("open" as const) : ("closed" as const),
          };
        }),
      );
    const { error: seqErr } = await supabase.from("sequences").insert(sequenceRows);
    if (seqErr) throw seqErr;

    // 4. Classes + subjects
    for (const c of data.classes) {
      const { data: cls, error: clsErr } = await supabase
        .from("classes")
        .insert({
          school_id: schoolId,
          academic_year_id: year.id,
          level: c.level,
          stream: c.stream ?? null,
          name: c.name,
        })
        .select("id")
        .single();
      if (clsErr || !cls) throw clsErr ?? new Error("Failed to create class");

      const subjects: SubjectDefault[] = presetSubjects(subsystem, c.presetKey);
      const { error: subjErr } = await supabase.from("subjects").insert(
        subjects.map((s, idx) => ({
          class_id: cls.id,
          school_id: schoolId,
          name: s.name,
          coefficient: s.coefficient,
          display_order: idx,
        })),
      );
      if (subjErr) throw subjErr;
    }

    return { schoolId };
  });

export const getSchoolSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ schoolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [classesRes, studentsRes, yearRes] = await Promise.all([
      supabase.from("classes").select("id, name, level, stream").eq("school_id", data.schoolId),
      supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", data.schoolId),
      supabase.from("academic_years").select("id, label, is_current").eq("school_id", data.schoolId).order("created_at", { ascending: false }),
    ]);
    if (classesRes.error) throw classesRes.error;
    if (yearRes.error) throw yearRes.error;
    if (studentsRes.error) throw studentsRes.error;
    return {
      classes: classesRes.data ?? [],
      studentCount: studentsRes.count ?? 0,
      years: yearRes.data ?? [],
    };
  });
export const updateSchoolBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ schoolId: z.string().uuid(), logo_url: z.string().max(800000).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("schools").update({ logo_url: data.logo_url }).eq("id", data.schoolId).select("id").single();
    if (error) throw error;
    return { ok: true };
  });
