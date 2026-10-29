import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Plus, Users, GraduationCap, ArrowRight, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { PageShell } from "@/components/page-shell";
import { useSchool } from "@/lib/use-school";
import { listClasses, createClass } from "@/lib/classes.functions";

export const Route = createFileRoute("/_authenticated/classes/")({
  head: () => ({ meta: [{"title": "Classes · Bulletin"}, {"name": "description", "content": "Manage school classes, subjects, and marksheets."}, {"property": "og:title", "content": "Classes · Bulletin"}, {"property": "og:description", "content": "Manage school classes, subjects, and marksheets."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex"}] }),
  component: ClassesPage,
});

function ClassesPage() {
  const { school } = useSchool();
  const qc = useQueryClient();
  const listFn = useServerFn(listClasses);
  const createFn = useServerFn(createClass);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", level: "", stream: "" });

  const classesQ = useQuery({
    queryKey: ["classes", school?.id],
    queryFn: () => listFn({ data: { schoolId: school!.id } }),
    enabled: !!school?.id,
  });

  const create = useMutation({
    mutationFn: () =>
      createFn({ data: { schoolId: school!.id, name: form.name.trim(), level: form.level.trim(), stream: form.stream.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Class created");
      setOpen(false);
      setForm({ name: "", level: "", stream: "" });
      qc.invalidateQueries({ queryKey: ["classes", school?.id] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const classes = classesQ.data ?? [];

  return (
    <PageShell
      title="Classes"
      subtitle={school?.name}
      eyebrow="Manage classes, subjects & QR codes"
      actions={<Button onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New class</Button>}
    >
      {classesQ.isLoading ? (
        <div className="grid gap-3 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-md bg-muted" />)}</div>
      ) : classes.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-12 text-center">
          <GraduationCap className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-3 font-medium">No classes yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create your first class to start adding students and subjects.</p>
          <Button className="mt-4" onClick={() => setOpen(true)}><Plus className="mr-1.5 h-4 w-4" /> New class</Button>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => (
            <Link
              key={c.id}
              to="/classes/$classId"
              params={{ classId: c.id }}
              className="group block rounded-md border border-border bg-card p-5 transition-colors hover:border-secondary hover:bg-surface"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="eyebrow">{c.level}{c.stream ? ` · ${c.stream}` : ""}</p>
                  <h3 className="mt-1 font-display text-xl font-semibold">{c.name}</h3>
                </div>
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {c.subjectCount} subjects</span>
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {c.studentCount} students</span>
              </div>
              <p className="mt-3 inline-flex items-center text-sm font-medium text-secondary">
                Open <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New class</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Class name</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder={school?.subsystem === "FR" ? "3e A" : "Form 4 Science"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Level</Label>
                <Input value={form.level} onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))} placeholder={school?.subsystem === "FR" ? "3e" : "Form 4"} />
              </div>
              <div className="space-y-1.5">
                <Label>Stream / Série</Label>
                <Input value={form.stream} onChange={(e) => setForm((f) => ({ ...f, stream: e.target.value }))} placeholder={school?.subsystem === "FR" ? "Série D" : "Science"} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => create.mutate()} disabled={!form.name.trim() || !form.level.trim() || create.isPending}>
              {create.isPending ? "Creating…" : "Create class"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
