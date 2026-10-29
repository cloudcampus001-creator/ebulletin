import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { FileText, Printer, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";
import { useSchool } from "@/lib/use-school";
import { listClasses } from "@/lib/classes.functions";
import { listSequences } from "@/lib/sequences.functions";
import { renderBulletins } from "@/lib/bulletins.functions";

export const Route = createFileRoute("/_authenticated/bulletins")({
  head: () => ({ meta: [{"title": "Report cards · Bulletin"}, {"name": "description", "content": "Generate print-ready school report cards with weighted averages and ranks."}, {"property": "og:title", "content": "Report cards · Bulletin"}, {"property": "og:description", "content": "Generate print-ready school report cards with weighted averages and ranks."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex"}] }),
  component: BulletinsPage,
});

function BulletinsPage() {
  const { school } = useSchool();
  const classesFn = useServerFn(listClasses);
  const seqFn = useServerFn(listSequences);
  const renderFn = useServerFn(renderBulletins);

  const classesQ = useQuery({ queryKey: ["classes", school?.id], queryFn: () => classesFn({ data: { schoolId: school!.id } }), enabled: !!school?.id });
  const seqQ = useQuery({ queryKey: ["sequences", school?.id], queryFn: () => seqFn({ data: { schoolId: school!.id } }), enabled: !!school?.id });

  const [classId, setClassId] = useState("");
  const [seqId, setSeqId] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (!classId && classesQ.data?.length) setClassId(classesQ.data[0].id); }, [classesQ.data, classId]);
  useEffect(() => { if (!seqId && seqQ.data?.length) setSeqId((seqQ.data.find((s: any) => s.status === "open") ?? seqQ.data[0]).id); }, [seqQ.data, seqId]);

  const selectedClass = (classesQ.data ?? []).find((c) => c.id === classId);
  const selectedSeq = (seqQ.data ?? []).find((s: any) => s.id === seqId);

  async function generate() {
    if (!classId || !seqId) return;
    setBusy(true);
    // Open the window synchronously so it isn't blocked as a popup.
    const win = window.open("", "_blank");
    if (win) win.document.write('<!doctype html><title>Generating…</title><body style="font-family:Inter,system-ui,sans-serif;color:#5B6472;padding:40px;">Generating report cards…</body>');
    try {
      const { html } = await renderFn({ data: { classId, sequenceId: seqId } });
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      } else {
        // Popup blocked — fall back to a blob download.
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `bulletins-${selectedClass?.name ?? "class"}.html`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Report cards downloaded — open the file to print.");
      }
    } catch (e: any) {
      if (win) win.close();
      toast.error(e?.message ?? "Could not generate report cards.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <PageShell
      title="Report Cards"
      subtitle={school?.name}
      eyebrow="Server-generated, print-ready bulletins"
      actions={
        <>
          <select value={classId} onChange={(e) => setClassId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {(classesQ.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={seqId} onChange={(e) => setSeqId(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-sm">
            {(seqQ.data ?? []).map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button onClick={generate} disabled={!classId || !seqId || busy}>
            {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Printer className="mr-1.5 h-4 w-4" />}
            Generate report cards
          </Button>
        </>
      }
    >
      <div className="mx-auto max-w-2xl rounded-lg border border-border bg-card p-8 text-center shadow-paper">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold">
          {selectedClass ? selectedClass.name : "Select a class"}
          {selectedSeq ? <span className="text-muted-foreground"> · {(selectedSeq as any).name}</span> : null}
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Report cards are rendered on the server with your school logo, header and the
          official field grid — complete with weighted averages, per-subject ranks,
          appréciations, conduct and remarks. Click <strong>Generate report cards</strong> to
          open the print-ready document in a new tab, then use Print / Save&nbsp;as&nbsp;PDF.
        </p>
        <div className="mt-6">
          <Button onClick={generate} disabled={!classId || !seqId || busy} size="lg">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Printer className="mr-2 h-4 w-4" />}
            Generate for {selectedClass?.name ?? "class"}
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
