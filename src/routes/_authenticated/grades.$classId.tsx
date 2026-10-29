import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";
import { useSchool } from "@/lib/use-school";
import { getClass } from "@/lib/classes.functions";
import { listSequences } from "@/lib/sequences.functions";
import { getGradeGrid, saveGrades } from "@/lib/grades.functions";
import { maxMark } from "@/lib/grading";
import { SaveStatus, ValidationError, isValidationError } from "@/components/save-status";

export const Route = createFileRoute("/_authenticated/grades/$classId")({
  head: () => ({ meta: [{"title": "Enter marks · Bulletin"}, {"name": "description", "content": "Enter and save marks for each class and sequence."}, {"property": "og:title", "content": "Enter marks · Bulletin"}, {"property": "og:description", "content": "Enter and save marks for each class and sequence."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex"}] }),
  component: GradeGrid,
});

function GradeGrid() {
  const { classId } = Route.useParams();
  const { school } = useSchool();
  const qc = useQueryClient();
  const max = maxMark((school?.subsystem ?? "EN") as any);
  const classFn = useServerFn(getClass);
  const seqFn = useServerFn(listSequences);
  const gridFn = useServerFn(getGradeGrid);
  const saveFn = useServerFn(saveGrades);

  const classQ = useQuery({ queryKey: ["class", classId], queryFn: () => classFn({ data: { classId } }) });
  const seqQ = useQuery({ queryKey: ["sequences", school?.id], queryFn: () => seqFn({ data: { schoolId: school?.id ?? "" } }), enabled: !!school?.id });
  const [seqId, setSeqId] = useState("");
  useEffect(() => {
    if (!seqId && seqQ.data?.length) setSeqId((seqQ.data.find((s: any) => s.status === "open") ?? seqQ.data[0]).id);
  }, [seqQ.data, seqId]);

  const gridQ = useQuery({ queryKey: ["grid", classId, seqId], queryFn: () => gridFn({ data: { classId, sequenceId: seqId } }), enabled: !!seqId });
  const [marks, setMarks] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!gridQ.data) return;
    const m: Record<string, string> = {};
    Object.entries(gridQ.data.marks).forEach(([k, v]) => { if (v != null) m[k] = String(v); });
    setMarks(m);
  }, [gridQ.data]);

  const save = useMutation({
    mutationFn: () => {
      if (!gridQ.data || !school) throw new ValidationError("The class has not loaded. Please try again.");
      const entries: any[] = [];
      const students = gridQ.data.students;
      const subjects: { id: string; name: string; coefficient: number }[] = gridQ.data.subjects;
      for (const st of students) for (const su of subjects) {
        const key = `${st.id}:${su.id}`;
        const raw = marks[key];
        const val = raw === undefined || raw === "" ? null : Number(raw);
        if (val !== null && (Number.isNaN(val) || val < 0 || val > max)) throw new ValidationError(`Invalid mark for ${st.last_name} (${su.name}). Must be 0–${max}.`);
        if (val !== null || gridQ.data.marks[key] != null) entries.push({ studentId: st.id, subjectId: su.id, mark: val });
      }
      return saveFn({ data: { schoolId: school?.id ?? "", sequenceId: seqId, entries } });
    },
    // Retry once with backoff before falling back to the manual retry banner.
    retry: (count, err) => count < 1 && !isValidationError(err),
    retryDelay: 1500,
    onSuccess: (r) => { toast.success(`Saved ${r.saved} marks`); qc.invalidateQueries({ queryKey: ["grid", classId, seqId] }); },
    onError: (e: any) => { if (isValidationError(e)) toast.error(e?.message ?? "Invalid marks"); },
  });

  const data = gridQ.data;
  return (
    <PageShell
      title="Enter marks"
      subtitle={classQ.data?.class.name}
      eyebrow={`Out of ${max}`}
      actions={
        <>
          <select value={seqId} onChange={(e) => setSeqId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {(seqQ.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}{s.status === "open" ? " (open)" : ""}</option>)}
          </select>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !data}><Save className="mr-1.5 h-4 w-4" /> Save</Button>
          <Link to="/classes/$classId" params={{ classId }}><Button variant="ghost"><ArrowLeft className="mr-1.5 h-4 w-4" /> Back</Button></Link>
        </>
      }
    >
      <SaveStatus
        className="mb-3"
        error={save.isError && !isValidationError(save.error) ? "unsaved" : null}
        retrying={save.isPending}
        onRetry={() => save.mutate()}
      />
      {gridQ.isError || seqQ.isError || classQ.isError ? <p className="text-destructive">Could not load marks. <Button variant="outline" onClick={() => { gridQ.refetch(); seqQ.refetch(); classQ.refetch(); }}>Try again</Button></p> : !seqId && seqQ.isSuccess ? <p className="text-muted-foreground">No marking sequences are available.</p> : !data ? <div className="h-40 animate-pulse rounded-md bg-muted" /> : data.students.length === 0 || data.subjects.length === 0 ? (
        <p className="text-muted-foreground">Add students and subjects to this class first.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="bg-surface">
                <th className="sticky left-0 z-10 bg-surface px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Student</th>
                {data.subjects.map((su) => <th key={su.id} className="px-2 py-2 text-center text-xs font-medium">{su.name}<span className="block text-[10px] text-muted-foreground">coef {su.coefficient}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {data.students.map((st, i) => (
                <tr key={st.id} className={i % 2 ? "bg-background" : "bg-card"}>
                  <td className="sticky left-0 z-10 whitespace-nowrap border-t border-border bg-inherit px-3 py-1.5 font-medium">{st.last_name} {st.first_name}</td>
                  {data.subjects.map((su) => {
                    const key = `${st.id}:${su.id}`;
                    return (
                      <td key={su.id} className="border-t border-border px-1 py-1 text-center">
                        <input
                          inputMode="decimal"
                          value={marks[key] ?? ""}
                          onChange={(e) => setMarks((m) => ({ ...m, [key]: e.target.value }))}
                          className="h-9 w-16 rounded border border-input bg-background text-center tabular-nums focus:border-secondary focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
