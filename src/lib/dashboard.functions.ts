import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ schoolId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const [clsRes, subjRes, studRes, teacherRes, seqRes] = await Promise.all([
      supabase.from("classes").select("id, name, level, stream").eq("school_id", data.schoolId).order("created_at", { ascending: true }),
      supabase.from("subjects").select("id, class_id").eq("school_id", data.schoolId),
      supabase.from("students").select("id, class_id").eq("school_id", data.schoolId),
      supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", data.schoolId),
      supabase.from("sequences").select("id, index, name, status, terms(name)").eq("school_id", data.schoolId).eq("status", "open").order("index", { ascending: true }).limit(1).maybeSingle(),
    ]);
    if (clsRes.error) throw clsRes.error;

    const openSeq = seqRes.data;
    let gradeCounts = new Map<string, number>(); // class_id -> filled marks for open seq
    if (openSeq) {
      const { data: grades } = await supabase
        .from("grades")
        .select("subject_id, mark, subjects(class_id)")
        .eq("sequence_id", openSeq.id);
      (grades ?? []).forEach((g: any) => {
        if (g.mark == null) return;
        const cid = g.subjects?.class_id;
        if (cid) gradeCounts.set(cid, (gradeCounts.get(cid) ?? 0) + 1);
      });
    }

    const subjPerClass = new Map<string, number>();
    (subjRes.data ?? []).forEach((s) => subjPerClass.set(s.class_id, (subjPerClass.get(s.class_id) ?? 0) + 1));
    const studPerClass = new Map<string, number>();
    (studRes.data ?? []).forEach((s) => studPerClass.set(s.class_id, (studPerClass.get(s.class_id) ?? 0) + 1));

    const classes = (clsRes.data ?? []).map((c) => {
      const subjects = subjPerClass.get(c.id) ?? 0;
      const students = studPerClass.get(c.id) ?? 0;
      const expected = subjects * students;
      const filled = gradeCounts.get(c.id) ?? 0;
      return {
        ...c,
        subjects,
        students,
        completion: expected > 0 ? Math.round((filled / expected) * 100) : 0,
      };
    });

    return {
      classes,
      totals: {
        classes: classes.length,
        students: (studRes.data ?? []).length,
        subjects: (subjRes.data ?? []).length,
        teachers: teacherRes.count ?? 0,
      },
      openSequence: openSeq ? { id: openSeq.id, name: openSeq.name, term: (openSeq as any).terms?.name ?? null } : null,
    };
  });
