import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { GraduationCap, LogOut, Save, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { marksheetInfo, teacherLogin, teacherSession, teacherLogout, marksheetRoster, saveMarksheet } from "@/lib/marksheet.functions";
import { SaveStatus, ValidationError, isValidationError } from "@/components/save-status";
import { maxMark } from "@/lib/grading";

export const Route = createFileRoute("/marksheet/$token")({
  ssr: false,
  head: () => ({ meta: [{ title: "Marksheet" }, { name: "robots", content: "noindex" }] }),
  component: Marksheet,
});

function Marksheet() {
  const { token } = Route.useParams();
  const infoFn = useServerFn(marksheetInfo);
  const loginFn = useServerFn(teacherLogin);
  const sessFn = useServerFn(teacherSession);
  const logoutFn = useServerFn(teacherLogout);

  const infoQ = useQuery({ queryKey: ["ms-info", token], queryFn: () => infoFn({ data: { token } }) });
  const sessQ = useQuery({ queryKey: ["ms-sess"], queryFn: () => sessFn() });

  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [subjects, setSubjects] = useState<any[] | null>(null);
  const [me, setMe] = useState<{ fullName: string } | null>(null);
  const [activeSubject, setActiveSubject] = useState<any | null>(null);

  useEffect(() => {
    if (sessQ.data?.authenticated && !me) setMe({ fullName: sessQ.data.fullName });
  }, [sessQ.data, me]);

  const login = useMutation({
    mutationFn: () => loginFn({ data: { token, login_code: code.trim(), password: pw } }),
    onSuccess: (r) => { setSubjects(r.subjects); setMe({ fullName: r.fullName }); toast.success(`Welcome, ${r.fullName}`); },
    onError: (e: any) => toast.error(e?.message ?? "Login failed"),
  });
  const logout = useMutation({
    mutationFn: () => logoutFn(),
    onSuccess: () => { setMe(null); setSubjects(null); setActiveSubject(null); setCode(""); setPw(""); sessQ.refetch(); },
  });

  const info = infoQ.data;

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {info?.school.logo_url ? <img src={info.school.logo_url} alt="" className="h-8 w-8 object-contain" /> : <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground"><GraduationCap className="h-4 w-4" /></div>}
            <div><p className="text-sm font-semibold leading-tight">{info?.school.name ?? "Marksheet"}</p><p className="text-xs text-muted-foreground">{info?.class.name}</p></div>
          </div>
          {me && <Button variant="ghost" size="sm" onClick={() => logout.mutate()}><LogOut className="mr-1.5 h-4 w-4" /> Exit</Button>}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        {infoQ.isError && <p className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">Invalid or expired QR code.</p>}

        {info && !info.openSequence && (
          <p className="rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">No sequence is currently open for marking. Please check with the administration.</p>
        )}

        {info && info.openSequence && !me && (
          <div className="mx-auto max-w-sm rounded-md border border-border bg-card p-6">
            <p className="eyebrow">Teacher login</p>
            <h1 className="mt-1 font-display text-2xl font-semibold">{info.class.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{info.openSequence.name}{info.openSequence.term ? ` · ${info.openSequence.term}` : ""}</p>
            <div className="mt-5 space-y-3">
              <div className="space-y-1.5"><Label>Login code / name</Label><Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="username" /></div>
              <div className="space-y-1.5"><Label>Password</Label><Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && login.mutate()} /></div>
              <Button className="w-full" onClick={() => login.mutate()} disabled={!code.trim() || !pw || login.isPending}>{login.isPending ? "Signing in…" : "Sign in"}</Button>
            </div>
          </div>
        )}

        {me && !activeSubject && (
          <div>
            <p className="text-sm text-muted-foreground">Signed in as <span className="font-medium text-foreground">{me.fullName}</span></p>
            <h1 className="mt-1 font-display text-2xl font-semibold">Choose a subject</h1>
            {!subjects && <SubjectsFromSession onPick={setActiveSubject} />}
            <div className="mt-4 grid gap-2">
              {(subjects ?? []).map((s) => (
                <button key={s.id} onClick={() => setActiveSubject(s)} className="rounded-md border border-border bg-card p-4 text-left transition-colors hover:border-secondary">
                  <p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">Coefficient {s.coefficient}</p>
                </button>
              ))}
              {subjects && subjects.length === 0 && <p className="text-sm text-muted-foreground">You have no subjects assigned in this class.</p>}
            </div>
          </div>
        )}

        {me && activeSubject && <RosterEntry subject={activeSubject} subsystem={info?.school.subsystem ?? "EN"} onBack={() => setActiveSubject(null)} />}
      </main>
    </div>
  );
}

// If the page was reloaded but session is still valid, we re-fetch subjects via roster fallback by asking the user to re-pick is not possible; so just show nothing extra.
function SubjectsFromSession({ onPick }: { onPick: (s: any) => void }) {
  return <p className="mt-3 text-sm text-muted-foreground">Loading your subjects… If nothing appears, tap Exit and sign in again.</p>;
}

function RosterEntry({ subject, subsystem, onBack }: { subject: any; subsystem: string; onBack: () => void }) {
  const rosterFn = useServerFn(marksheetRoster);
  const saveFn = useServerFn(saveMarksheet);
  const max = maxMark(subsystem as any);
  const q = useQuery({ queryKey: ["ms-roster", subject.id], queryFn: () => rosterFn({ data: { subjectId: subject.id } }) });
  const [marks, setMarks] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!q.data) return;
    const m: Record<string, string> = {};
    Object.entries(q.data.marks).forEach(([k, v]) => { if (v != null) m[k] = String(v); });
    setMarks(m);
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => {
      const entries: any[] = [];
      for (const st of q.data!.students) {
        const raw = marks[st.id];
        const val = raw === undefined || raw === "" ? null : Number(raw);
        if (val !== null && (Number.isNaN(val) || val < 0 || val > max)) throw new ValidationError(`Invalid mark for ${st.last_name}. Must be 0–${max}.`);
        if (val !== null || q.data!.marks[st.id] != null) entries.push({ studentId: st.id, mark: val });
      }
      return saveFn({ data: { subjectId: subject.id, entries } });
    },
    retry: (count, err) => count < 1 && !isValidationError(err),
    retryDelay: 1500,
    onSuccess: (r) => toast.success(`Saved ${r.saved} marks`),
    onError: (e: any) => { if (isValidationError(e)) toast.error(e?.message ?? "Invalid marks"); },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="mr-1 h-4 w-4" /> Subjects</button>
        <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || !q.data}><Save className="mr-1.5 h-4 w-4" /> Save</Button>
      </div>
      <h1 className="mt-2 font-display text-2xl font-semibold">{subject.name}</h1>
      <p className="text-sm text-muted-foreground">{q.data?.sequence.name} · out of {max}</p>
      <SaveStatus
        className="mt-3"
        error={save.isError && !isValidationError(save.error) ? "unsaved" : null}
        retrying={save.isPending}
        onRetry={() => save.mutate()}
      />
      {!q.data ? <div className="mt-4 h-40 animate-pulse rounded-md bg-muted" /> : (
        <div className="mt-4 space-y-1.5">
          {q.data.students.map((st) => (
            <div key={st.id} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
              <span className="text-sm font-medium">{st.last_name} {st.first_name}</span>
              <input inputMode="decimal" value={marks[st.id] ?? ""} onChange={(e) => setMarks((m) => ({ ...m, [st.id]: e.target.value }))} placeholder="—" className="h-9 w-20 rounded border border-input bg-background text-center tabular-nums focus:border-secondary focus:outline-none focus:ring-1 focus:ring-ring" />
            </div>
          ))}
          {q.data.students.length === 0 && <p className="text-sm text-muted-foreground">No students in this class yet.</p>}
        </div>
      )}
      <div className="h-20" />
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-3">
        <div className="mx-auto max-w-2xl space-y-2">
          <SaveStatus
            error={save.isError && !isValidationError(save.error) ? "unsaved" : null}
            retrying={false}
            onRetry={() => save.mutate()}
          />
          <Button className="w-full" onClick={() => save.mutate()} disabled={save.isPending || !q.data}><Save className="mr-1.5 h-4 w-4" /> Save marks</Button>
        </div>
      </div>
    </div>
  );
}
