import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { defaultBands, maxMark, type GradeBand, type Subsystem } from "@/lib/grading";
import { renderBulletinDocument, type BulletinDoc } from "@/lib/bulletin-render";

export const getBulletinData = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ classId: z.string().uuid(), sequenceId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cls, error: clsErr } = await supabase
      .from("classes")
      .select("id, name, level, stream, school_id, schools(name, logo_url, subsystem, address, motto, grade_bands)")
      .eq("id", data.classId)
      .single();
    if (clsErr || !cls) throw clsErr ?? new Error("Class not found");
    const school = (cls as any).schools;

    const [seqRes, subjRes, studRes, gradeRes, conductRes, remarkRes] = await Promise.all([
      supabase.from("sequences").select("id, index, name, status, terms(index, name)").eq("id", data.sequenceId).single(),
      supabase.from("subjects").select("id, name, coefficient, display_order").eq("class_id", data.classId).order("display_order", { ascending: true }),
      supabase.from("students").select("id, matricule, last_name, first_name, sex, date_of_birth").eq("class_id", data.classId).order("last_name", { ascending: true }),
      supabase.from("grades").select("student_id, subject_id, mark").eq("sequence_id", data.sequenceId),
      supabase.from("conduct_attendance").select("student_id, conduct, absences_justified, absences_unjustified").eq("sequence_id", data.sequenceId),
      supabase.from("remarks").select("student_id, class_teacher_remark, principal_remark, council_decision").eq("sequence_id", data.sequenceId),
    ]);
    if (subjRes.error) throw subjRes.error;
    if (studRes.error) throw studRes.error;
    if (gradeRes.error) throw gradeRes.error;

    return {
      school: {
        name: school?.name ?? "",
        logo_url: school?.logo_url ?? null,
        subsystem: school?.subsystem ?? "EN",
        address: school?.address ?? null,
        motto: school?.motto ?? null,
        grade_bands: school?.grade_bands ?? null,
      },
      class: { id: cls.id, name: cls.name, level: cls.level, stream: cls.stream },
      sequence: seqRes.data
        ? { id: seqRes.data.id, name: seqRes.data.name, term: (seqRes.data as any).terms?.name ?? null }
        : null,
      subjects: (subjRes.data ?? []).map((s) => ({ ...s, coefficient: Number(s.coefficient) })),
      students: studRes.data ?? [],
      grades: (gradeRes.data ?? []).map((g) => ({
        studentId: g.student_id,
        subjectId: g.subject_id,
        mark: g.mark == null ? null : Number(g.mark),
      })),
      conduct: conductRes.data ?? [],
      remarks: remarkRes.data ?? [],
    };
  });

// Builds the complete, print-ready report-card HTML document on the SERVER.
// The browser only displays the server-generated document.
export const renderBulletins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ classId: z.string().uuid(), sequenceId: z.string().uuid() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cls, error: clsErr } = await supabase
      .from("classes")
      .select(
        "id, name, level, stream, school_id, schools(name, logo_url, subsystem, address, motto, grade_bands)",
      )
      .eq("id", data.classId)
      .single();
    if (clsErr || !cls) throw clsErr ?? new Error("Class not found");
    const school = (cls as any).schools;
    const subsystem = (school?.subsystem ?? "EN") as Subsystem;

    const [seqRes, subjRes, studRes, gradeRes, conductRes, remarkRes] = await Promise.all([
      supabase.from("sequences").select("id, index, name, status, terms(index, name)").eq("id", data.sequenceId).single(),
      supabase.from("subjects").select("id, name, coefficient, display_order").eq("class_id", data.classId).order("display_order", { ascending: true }),
      supabase.from("students").select("id, matricule, last_name, first_name, sex, date_of_birth").eq("class_id", data.classId).order("last_name", { ascending: true }),
      supabase.from("grades").select("student_id, subject_id, mark").eq("sequence_id", data.sequenceId),
      supabase.from("conduct_attendance").select("student_id, conduct, absences_justified, absences_unjustified").eq("sequence_id", data.sequenceId),
      supabase.from("remarks").select("student_id, class_teacher_remark, principal_remark, council_decision").eq("sequence_id", data.sequenceId),
    ]);
    if (subjRes.error) throw subjRes.error;
    if (studRes.error) throw studRes.error;
    if (gradeRes.error) throw gradeRes.error;

    const doc: BulletinDoc = {
      school: {
        name: school?.name ?? "",
        logo_url: school?.logo_url ?? null,
        subsystem,
        address: school?.address ?? null,
        motto: school?.motto ?? null,
        grade_bands: (school?.grade_bands as GradeBand[] | null) ?? null,
      },
      class: { id: cls.id, name: cls.name, level: cls.level, stream: cls.stream },
      sequence: seqRes.data
        ? { id: seqRes.data.id, name: seqRes.data.name, term: (seqRes.data as any).terms?.name ?? null }
        : null,
      subjects: (subjRes.data ?? []).map((s) => ({ ...s, coefficient: Number(s.coefficient) })),
      students: studRes.data ?? [],
      grades: (gradeRes.data ?? []).map((g) => ({
        studentId: g.student_id,
        subjectId: g.subject_id,
        mark: g.mark == null ? null : Number(g.mark),
      })),
      conduct: conductRes.data ?? [],
      remarks: remarkRes.data ?? [],
    };

    const bands: GradeBand[] = doc.school.grade_bands ?? defaultBands(subsystem);
    const html = renderBulletinDocument(doc, {
      bands,
      max: maxMark(subsystem),
      fr: subsystem === "FR",
    });
    return { html };
  });
