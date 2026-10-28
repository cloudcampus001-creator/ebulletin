import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, KeyRound, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageShell } from "@/components/page-shell";
import { useSchool } from "@/lib/use-school";
import { listTeachers, createTeacher, updateTeacher, deleteTeacher, resetTeacherPassword } from "@/lib/teachers.functions";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff · Bulletin" }, { name: "robots", content: "noindex" }] }),
  component: StaffPage,
});

function StaffPage() {
  const { school } = useSchool();
  const qc = useQueryClient();
  const listFn = useServerFn(listTeachers);
  const createFn = useServerFn(createTeacher);
  const updFn = useServerFn(updateTeacher);
  const delFn = useServerFn(deleteTeacher);
  const resetFn = useServerFn(resetTeacherPassword);

  const q = useQuery({ queryKey: ["teachers", school?.id], queryFn: () => listFn({ data: { schoolId: school?.id ?? "" } }), enabled: !!school?.id });
  const teachers = q.data?.teachers ?? [];
  const assignments = q.data?.assignments ?? [];
  const reload = () => qc.invalidateQueries({ queryKey: ["teachers", school?.id] });

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ full_name: "", login_code: "", password: "" });
  const [edit, setEdit] = useState<any | null>(null);
  const [reset, setReset] = useState<any | null>(null);
  const [newPw, setNewPw] = useState("");

  const create = useMutation({
    mutationFn: () => createFn({ data: { schoolId: school?.id ?? "", full_name: form.full_name.trim(), login_code: form.login_code.trim(), password: form.password } }),
    onSuccess: () => { setOpen(false); setForm({ full_name: "", login_code: "", password: "" }); reload(); toast.success("Teacher account created"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const update = useMutation({
    mutationFn: () => updFn({ data: { teacherId: edit.id, full_name: edit.full_name.trim(), login_code: edit.login_code.trim(), active: edit.active } }),
    onSuccess: () => { setEdit(null); reload(); toast.success("Saved"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const del = useMutation({ mutationFn: (id: string) => delFn({ data: { teacherId: id } }), onSuccess: () => { reload(); toast.success("Removed"); }, onError: (e: any) => toast.error(e?.message ?? "Failed") });
  const doReset = useMutation({
    mutationFn: () => resetFn({ data: { teacherId: reset.id, password: newPw } }),
    onSuccess: () => { setReset(null); setNewPw(""); toast.success("Password reset"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const asgFor = (id: string) => assignments.filter((a: any) => a.teacher_id === id);

  return (
    <PageShell title="Staff" subtitle={school?.name} eyebrow="Teacher accounts for QR marksheet"
      actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New teacher</Button>}>
      {q.isError && <p className="mb-4 text-sm text-destructive">Could not load staff. <Button variant="outline" onClick={() => q.refetch()}>Try again</Button></p>}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr><th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Login code</th><th className="px-4 py-2.5">Subjects</th><th className="px-4 py-2.5 w-16">Active</th><th className="px-4 py-2.5 w-28"></th></tr>
          </thead>
          <tbody>
            {teachers.map((t: any) => (
              <tr key={t.id} className="border-t border-border">
                <td className="px-4 py-2.5 font-medium">{t.full_name}</td>
                <td className="px-4 py-2.5 text-muted-foreground">{t.login_code}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{asgFor(t.id).map((a: any) => `${a.subjects?.name} (${a.classes?.name})`).join(", ") || "—"}</td>
                <td className="px-4 py-2.5">{t.active ? "Yes" : "No"}</td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${t.full_name}`} title="Edit teacher" onClick={() => setEdit({ ...t })}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Reset password for ${t.full_name}`} title="Reset password" onClick={() => setReset(t)}><KeyRound className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label={`Delete ${t.full_name}`} title="Delete teacher" onClick={() => { if (window.confirm(`Delete ${t.full_name}?`)) del.mutate(t.id); }}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No teacher accounts yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New teacher</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5"><Label htmlFor="teacher-name">Full name</Label><Input id="teacher-name" maxLength={120} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} placeholder="Mr. Tabe John" /></div>
            <div className="space-y-1.5"><Label htmlFor="teacher-code">Login code</Label><Input id="teacher-code" maxLength={40} value={form.login_code} onChange={(e) => setForm((f) => ({ ...f, login_code: e.target.value }))} placeholder="tabe.john" /><p className="text-xs text-muted-foreground">Teachers use this + password on the QR page.</p></div>
            <div className="space-y-1.5"><Label htmlFor="teacher-password">Password</Label><Input id="teacher-password" maxLength={72} type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} placeholder="Set a password" /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={() => create.mutate()} disabled={!school || form.full_name.trim().length < 2 || form.login_code.trim().length < 3 || form.password.length < 4 || create.isPending}>Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit teacher</DialogTitle></DialogHeader>
          {edit && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Full name</Label><Input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Login code</Label><Input value={edit.login_code} onChange={(e) => setEdit({ ...edit, login_code: e.target.value })} /></div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active</label>
            </div>
          )}
          <DialogFooter><Button variant="ghost" onClick={() => setEdit(null)}>Cancel</Button><Button onClick={() => update.mutate()} disabled={update.isPending}>Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reset} onOpenChange={(o) => !o && setReset(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader>
          <div className="space-y-1.5"><Label htmlFor="teacher-new-password">New password</Label><Input id="teacher-new-password" maxLength={72} type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} /></div>
          <DialogFooter><Button variant="ghost" onClick={() => setReset(null)}>Cancel</Button><Button onClick={() => doReset.mutate()} disabled={newPw.length < 4 || doReset.isPending}>Reset</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
