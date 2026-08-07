import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRef } from "react";
import { toast } from "sonner";
import { Lock, Unlock, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";
import { useSchool } from "@/lib/use-school";
import { listSequences, setSequenceStatus } from "@/lib/sequences.functions";
import { updateSchoolBranding } from "@/lib/schools.functions";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings · Bulletin" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { school, query } = useSchool();
  const qc = useQueryClient();
  const seqFn = useServerFn(listSequences);
  const statusFn = useServerFn(setSequenceStatus);
  const brandFn = useServerFn(updateSchoolBranding);
  const fileRef = useRef<HTMLInputElement>(null);

  const seqQ = useQuery({ queryKey: ["sequences", school?.id], queryFn: () => seqFn({ data: { schoolId: school!.id } }), enabled: !!school?.id });
  const sequences = seqQ.data ?? [];

  const setStatus = useMutation({
    mutationFn: (v: { sequenceId: string; status: "open" | "closed" }) => statusFn({ data: { schoolId: school!.id, ...v } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["sequences", school?.id] }); toast.success("Sequence updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const setLogo = useMutation({
    mutationFn: (logo: string | null) => brandFn({ data: { schoolId: school!.id, logo_url: logo } }),
    onSuccess: () => { query.refetch(); toast.success("Logo updated"); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const onLogo = async (f: File) => {
    if (f.size > 500_000) return toast.error("Please use an image under 500 KB.");
    const reader = new FileReader();
    reader.onload = () => setLogo.mutate(reader.result as string);
    reader.readAsDataURL(f);
  };

  return (
    <PageShell title="Settings" subtitle={school?.name} eyebrow="School configuration">
      <section className="max-w-xl">
        <h2 className="font-display text-xl font-semibold">School logo</h2>
        <p className="mt-1 text-sm text-muted-foreground">Shown on every printed bulletin.</p>
        <div className="mt-4 flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border border-border bg-card">
            {school?.logo_url ? <img src={school.logo_url} alt="Logo" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">No logo</span>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onLogo(f); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={setLogo.isPending}><Upload className="mr-1.5 h-4 w-4" /> Upload logo</Button>
          {school?.logo_url && <Button variant="ghost" onClick={() => setLogo.mutate(null)}>Remove</Button>}
        </div>
      </section>

      <section className="mt-12 max-w-xl">
        <h2 className="font-display text-xl font-semibold">Sequences</h2>
        <p className="mt-1 text-sm text-muted-foreground">Open the sequence teachers should mark. Only one can be open — the teacher QR flow uses it automatically.</p>
        <div className="mt-4 space-y-2">
          {sequences.map((s: any) => (
            <div key={s.id} className="flex items-center justify-between rounded-md border border-border bg-card px-4 py-3">
              <div>
                <p className="font-medium">{s.name}</p>
                <p className="text-xs text-muted-foreground">{s.terms?.name}</p>
              </div>
              {s.status === "open" ? (
                <span className="inline-flex items-center gap-2">
                  <span className="rounded-full bg-secondary/15 px-2.5 py-0.5 text-xs font-semibold text-secondary">Open</span>
                  <Button size="sm" variant="ghost" onClick={() => setStatus.mutate({ sequenceId: s.id, status: "closed" })}><Lock className="mr-1 h-3.5 w-3.5" /> Close</Button>
                </span>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setStatus.mutate({ sequenceId: s.id, status: "open" })}><Unlock className="mr-1 h-3.5 w-3.5" /> Open</Button>
              )}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
