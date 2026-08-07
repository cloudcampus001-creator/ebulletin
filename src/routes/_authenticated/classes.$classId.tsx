import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { ArrowLeft, Plus, Trash2, Download, RefreshCw, Pencil, FileSpreadsheet, Upload, QrCode as QrIcon, GridIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageShell } from "@/components/page-shell";
import { useSchool } from "@/lib/use-school";
import { getClass, addSubject, updateSubject, deleteSubject, regenerateMarksheetToken } from "@/lib/classes.functions";
import { listStudents, addStudent, updateStudent, deleteStudent, importStudents } from "@/lib/students.functions";
import { listTeachers, assignTeacher, unassignTeacher } from "@/lib/teachers.functions";

export const Route = createFileRoute("/_authenticated/classes/$classId")({
  head: () => ({ meta: [{ title: "Class · Bulletin" }, { name: "robots", content: "noindex" }] }),
  component: ClassDetail,
});

function ClassDetail() {
  const { classId } = Route.useParams();
  const { school } = useSchool();
  const qc = useQueryClient();
  const getFn = useServerFn(getClass);

  const classQ = useQuery({
    queryKey: ["class", classId],
    queryFn: () => getFn({ data: { classId } }),
  });
  const data = classQ.data;
  const invalidate = () => qc.invalidateQueries({ queryKey: ["class", classId] });

  return (
    <PageShell
      title={data?.class.name ?? "Class"}
      subtitle={data ? `${data.class.level}${data.class.stream ? ` · ${data.class.stream}` : ""}` : undefined}
      eyebrow={school?.name}
      actions={
        <>
          <Link to="/grades/$classId" params={{ classId }}>
            <Button variant="outline"><GridIcon className="mr-1.5 h-4 w-4" /> Enter marks</Button>
          </Link>
          <Link to="/classes"><Button variant="ghost"><ArrowLeft className="mr-1.5 h-4 w-4" /> All classes</Button></Link>
        </>
      }
    >
      {!data ? (
        <div className="h-40 animate-pulse rounded-md bg-muted" />
      ) : (
        <Tabs defaultValue="subjects">
          <TabsList>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="qr">QR & Marksheet</TabsTrigger>
          </TabsList>

          <TabsContent value="subjects" className="mt-6">
            <SubjectsTab classId={classId} schoolId={school?.id ?? ""} subjects={data.subjects} onChange={invalidate} />
          </TabsContent>
          <TabsContent value="students" className="mt-6">
            <StudentsTab classId={classId} schoolId={school?.id ?? ""} subsystem={school?.subsystem ?? "EN"} />
          </TabsContent>
          <TabsContent value="teachers" className="mt-6">
            <TeachersTab classId={classId} schoolId={school?.id ?? ""} subjects={data.subjects} assignments={data.assignments} onChange={invalidate} />
          </TabsContent>
          <TabsContent value="qr" className="mt-6">
            <QrTab classId={classId} className={data.class.name} token={data.class.marksheet_token} onChange={invalidate} />
          </TabsContent>
        </Tabs>
      )}
    </PageShell>
  );
}

/* ---------------- Subjects ---------------- */
function SubjectsTab({ classId, schoolId, subjects, onChange }: { classId: string; schoolId: string; subjects: any[]; onChange: () => void }) {
  const addFn = useServerFn(addSubject);
  const updFn = useServerFn(updateSubject);
  const delFn = useServerFn(deleteSubject);
  const [name, setName] = useState("");
  const [coef, setCoef] = useState("1");
  const [edit, setEdit] = useState<any | null>(null);

  const add = useMutation({
    mutationFn: () => addFn({ data: { classId, schoolId, name: name.trim(), coefficient: Number(coef) || 1 } }),
    onSuccess: () => { setName(""); setCoef("1"); onChange(); toast.success("Subject added"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const upd = useMutation({
    mutationFn: () => updFn({ data: { subjectId: edit.id, name: edit.name.trim(), coefficient: Number(edit.coefficient) || 1 } }),
    onSuccess: () => { setEdit(null); onChange(); toast.success("Saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { subjectId: id } }),
    onSuccess: () => { onChange(); toast.success("Subject removed"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="max-w-2xl">
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-2.5">Subject</th><th className="px-4 py-2.5 w-24">Coef.</th><th className="px-4 py-2.5 w-20"></th></tr>
          </thead>
          <tbody>
            {subjects.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">{s.name}</td>
                <td className="px-4 py-2.5 tabular-nums">{s.coefficient}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => setEdit({ ...s })} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del.mutate(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {subjects.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No subjects yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-end gap-2">
        <div className="flex-1 space-y-1.5"><Label className="text-xs">Subject name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mathematics" /></div>
        <div className="w-24 space-y-1.5"><Label className="text-xs">Coef.</Label><Input type="number" min="0" step="0.5" value={coef} onChange={(e) => setCoef(e.target.value)} /></div>
        <Button onClick={() => add.mutate()} disabled={!name.trim() || add.isPending}><Plus className="h-4 w-4" /></Button>
      </div>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit subject</DialogTitle></DialogHeader>
          {edit && (
            <div className="grid grid-cols-[1fr_6rem] gap-3">
              <div className="space-y-1.5"><Label>Name</Label><Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Coef.</Label><Input type="number" min="0" step="0.5" value={edit.coefficient} onChange={(e) => setEdit({ ...edit, coefficient: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => upd.mutate()} disabled={upd.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Students ---------------- */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cur = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else inQ = false; }
      else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cur); cur = ""; }
    else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += ch;
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function StudentsTab({ classId, schoolId, subsystem }: { classId: string; schoolId: string; subsystem: string }) {
  const qc = useQueryClient();
  const listFn = useServerFn(listStudents);
  const addFn = useServerFn(addStudent);
  const updFn = useServerFn(updateStudent);
  const delFn = useServerFn(deleteStudent);
  const importFn = useServerFn(importStudents);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ last_name: "", first_name: "", matricule: "", sex: "" });
  const [edit, setEdit] = useState<any | null>(null);

  const q = useQuery({ queryKey: ["students", classId], queryFn: () => listFn({ data: { classId } }) });
  const students = q.data ?? [];
  const reload = () => qc.invalidateQueries({ queryKey: ["students", classId] });

  const add = useMutation({
    mutationFn: () => addFn({ data: { classId, schoolId, last_name: form.last_name.trim(), first_name: form.first_name.trim(), matricule: form.matricule.trim() || undefined, sex: (form.sex || undefined) as any } }),
    onSuccess: () => { setForm({ last_name: "", first_name: "", matricule: "", sex: "" }); reload(); toast.success("Student added"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const upd = useMutation({
    mutationFn: () => updFn({ data: { studentId: edit.id, last_name: edit.last_name.trim(), first_name: edit.first_name.trim(), matricule: edit.matricule?.trim() || undefined, sex: (edit.sex || undefined) as any } }),
    onSuccess: () => { setEdit(null); reload(); toast.success("Saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({ mutationFn: (id: string) => delFn({ data: { studentId: id } }), onSuccess: () => { reload(); toast.success("Removed"); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  const imp = useMutation({
    mutationFn: (rows: any[]) => importFn({ data: { classId, schoolId, rows } }),
    onSuccess: (r) => { reload(); toast.success(`Imported ${r.inserted} students`); },
    onError: (e: any) => toast.error(e?.message ?? "Import failed"),
  });

  const onFile = async (f: File) => {
    const text = await f.text();
    const rows = parseCsv(text);
    if (rows.length === 0) return toast.error("Empty file");
    let start = 0;
    const header = rows[0].map((c) => c.trim().toLowerCase());
    const hasHeader = header.some((h) => ["last_name", "lastname", "nom", "first_name", "firstname", "prenom", "prénom", "matricule"].includes(h));
    const idx = { last: 0, first: 1, mat: 2, sex: 3 };
    if (hasHeader) {
      start = 1;
      idx.last = header.findIndex((h) => ["last_name", "lastname", "nom", "name"].includes(h));
      idx.first = header.findIndex((h) => ["first_name", "firstname", "prenom", "prénom"].includes(h));
      idx.mat = header.findIndex((h) => ["matricule", "id", "matric"].includes(h));
      idx.sex = header.findIndex((h) => ["sex", "sexe", "gender"].includes(h));
    }
    const parsed = rows.slice(start).map((r) => {
      const sexRaw = (idx.sex >= 0 ? r[idx.sex] : "")?.trim().toUpperCase();
      return {
        last_name: (idx.last >= 0 ? r[idx.last] : r[0])?.trim() ?? "",
        first_name: (idx.first >= 0 ? r[idx.first] : r[1])?.trim() ?? "",
        matricule: (idx.mat >= 0 ? r[idx.mat] : "")?.trim() || undefined,
        sex: (sexRaw === "M" || sexRaw === "F" ? sexRaw : undefined) as any,
      };
    }).filter((r) => r.last_name && r.first_name);
    if (parsed.length === 0) return toast.error("No valid rows found. Columns: last_name, first_name, matricule, sex");
    imp.mutate(parsed);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{students.length} students</p>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}><Upload className="mr-1.5 h-4 w-4" /> Import CSV</Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Matricule</th><th className="px-4 py-2.5 w-16">Sex</th><th className="px-4 py-2.5 w-20"></th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">{s.last_name} {s.first_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{s.matricule ?? "—"}</td>
                <td className="px-4 py-2.5">{s.sex ?? "—"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <button onClick={() => setEdit({ ...s })} className="text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
                    <button onClick={() => del.mutate(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">No students yet. Add one below or import a CSV.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid items-end gap-2 sm:grid-cols-[1fr_1fr_8rem_5rem_auto]">
        <div className="space-y-1.5"><Label className="text-xs">Last name</Label><Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label className="text-xs">First name</Label><Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} /></div>
        <div className="space-y-1.5"><Label className="text-xs">Matricule</Label><Input value={form.matricule} onChange={(e) => setForm((f) => ({ ...f, matricule: e.target.value }))} /></div>
        <div className="space-y-1.5">
          <Label className="text-xs">Sex</Label>
          <select value={form.sex} onChange={(e) => setForm((f) => ({ ...f, sex: e.target.value }))} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">—</option><option value="M">M</option><option value="F">F</option>
          </select>
        </div>
        <Button onClick={() => add.mutate()} disabled={!form.last_name.trim() || !form.first_name.trim() || add.isPending}><Plus className="h-4 w-4" /></Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">CSV columns: <code>last_name, first_name, matricule, sex</code> (header optional).</p>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit student</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Last name</Label><Input value={edit.last_name} onChange={(e) => setEdit({ ...edit, last_name: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>First name</Label><Input value={edit.first_name} onChange={(e) => setEdit({ ...edit, first_name: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Matricule</Label><Input value={edit.matricule ?? ""} onChange={(e) => setEdit({ ...edit, matricule: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Sex</Label>
                  <select value={edit.sex ?? ""} onChange={(e) => setEdit({ ...edit, sex: e.target.value })} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">—</option><option value="M">M</option><option value="F">F</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => upd.mutate()} disabled={upd.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------------- Teachers ---------------- */
function TeachersTab({ classId, schoolId, subjects, assignments, onChange }: { classId: string; schoolId: string; subjects: any[]; assignments: any[]; onChange: () => void }) {
  const listFn = useServerFn(listTeachers);
  const assignFn = useServerFn(assignTeacher);
  const unassignFn = useServerFn(unassignTeacher);
  const [teacherId, setTeacherId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const teachersQ = useQuery({ queryKey: ["teachers", schoolId], queryFn: () => listFn({ data: { schoolId } }), enabled: !!schoolId });
  const teachers = teachersQ.data?.teachers ?? [];

  const assign = useMutation({
    mutationFn: () => assignFn({ data: { schoolId, classId, teacherId, subjectId } }),
    onSuccess: () => { setTeacherId(""); setSubjectId(""); onChange(); toast.success("Teacher assigned"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const unassign = useMutation({ mutationFn: (id: string) => unassignFn({ data: { assignmentId: id } }), onSuccess: () => { onChange(); toast.success("Removed"); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-muted-foreground">Assign teachers to the subjects they will mark via the class QR code. Manage teacher accounts under <Link to="/staff" className="font-medium text-secondary underline">Staff</Link>.</p>

      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-2.5">Teacher</th><th className="px-4 py-2.5">Subject</th><th className="px-4 py-2.5 w-12"></th></tr></thead>
          <tbody>
            {assignments.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">{a.teachers?.full_name}</td>
                <td className="px-4 py-2.5">{a.subjects?.name}</td>
                <td className="px-4 py-2.5"><button onClick={() => unassign.mutate(a.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {assignments.length === 0 && <tr><td colSpan={3} className="px-4 py-6 text-center text-muted-foreground">No teachers assigned yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 space-y-1.5"><Label className="text-xs">Teacher</Label>
          <select value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Select teacher…</option>
            {teachers.map((t: any) => <option key={t.id} value={t.id}>{t.full_name}</option>)}
          </select>
        </div>
        <div className="flex-1 space-y-1.5"><Label className="text-xs">Subject</Label>
          <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
            <option value="">Select subject…</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <Button onClick={() => assign.mutate()} disabled={!teacherId || !subjectId || assign.isPending}><Plus className="mr-1.5 h-4 w-4" /> Assign</Button>
      </div>
      {teachers.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No teacher accounts yet — create them under Staff first.</p>}
    </div>
  );
}

/* ---------------- QR ---------------- */
function QrTab({ classId, className, token, onChange }: { classId: string; className: string; token: string; onChange: () => void }) {
  const regenFn = useServerFn(regenerateMarksheetToken);
  const [dataUrl, setDataUrl] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => { setOrigin(window.location.origin); }, []);
  const url = origin ? `${origin}/marksheet/${token}` : "";

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: "#1a2b50", light: "#ffffff" } }).then(setDataUrl).catch(() => {});
  }, [url]);

  const regen = useMutation({
    mutationFn: () => regenFn({ data: { classId } }),
    onSuccess: () => { onChange(); toast.success("QR code reset — old code no longer works"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const download = () => {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `qr-${className.replace(/\s+/g, "-").toLowerCase()}.png`;
    a.click();
  };

  return (
    <div className="max-w-md">
      <div className="rounded-md border border-border bg-card p-6 text-center">
        <div className="mx-auto flex items-center justify-center gap-2 text-muted-foreground"><QrIcon className="h-4 w-4" /><p className="eyebrow">Class marksheet QR</p></div>
        {dataUrl ? <img src={dataUrl} alt="QR code" className="mx-auto mt-4 h-56 w-56 rounded-md border border-border" /> : <div className="mx-auto mt-4 h-56 w-56 animate-pulse rounded-md bg-muted" />}
        <p className="mt-4 font-display text-lg font-semibold">{className}</p>
        <p className="mt-1 break-all text-xs text-muted-foreground">{url}</p>
        <p className="mt-3 text-sm text-muted-foreground">Teachers scan this, log in with their name & password, pick their subject and enter marks for the open sequence.</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button variant="outline" size="sm" onClick={download} disabled={!dataUrl}><Download className="mr-1.5 h-4 w-4" /> Download</Button>
          <Button variant="ghost" size="sm" onClick={() => regen.mutate()} disabled={regen.isPending}><RefreshCw className="mr-1.5 h-4 w-4" /> Reset code</Button>
        </div>
      </div>
    </div>
  );
}
