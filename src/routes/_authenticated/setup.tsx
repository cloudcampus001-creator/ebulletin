import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GraduationCap, ArrowRight, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createSchool } from "@/lib/schools.functions";
import { SUBSYSTEM_PRESETS, presetSubjects } from "@/lib/defaults";
import type { Subsystem } from "@/lib/grading";

export const Route = createFileRoute("/_authenticated/setup")({
  head: () => ({ meta: [{ title: "Set up your school · Bulletin" }, { name: "robots", content: "noindex" }] }),
  component: SetupWizard,
});

type ClassDraft = { id: string; name: string; level: string; stream?: string; presetKey: string };

function SetupWizard() {
  const navigate = useNavigate();
  const createFn = useServerFn(createSchool);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [subsystem, setSubsystem] = useState<Subsystem>("FR");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [motto, setMotto] = useState("");
  const currentYear = new Date().getFullYear();
  const [yearLabel, setYearLabel] = useState(`${currentYear}–${currentYear + 1}`);

  const presetsForSubsystem = SUBSYSTEM_PRESETS[subsystem];
  const [classes, setClasses] = useState<ClassDraft[]>([
    subsystem === "FR"
      ? { id: crypto.randomUUID(), name: "3e A", level: "3e", presetKey: "college" }
      : { id: crypto.randomUUID(), name: "Form 4 Science", level: "Form 4", stream: "Science", presetKey: "form-science" },
  ]);

  const updateSubsystem = (s: Subsystem) => {
    setSubsystem(s);
    setClasses([
      s === "FR"
        ? { id: crypto.randomUUID(), name: "3e A", level: "3e", presetKey: "college" }
        : { id: crypto.randomUUID(), name: "Form 4 Science", level: "Form 4", stream: "Science", presetKey: "form-science" },
    ]);
  };

  const addClass = () => {
    const def = presetsForSubsystem[0];
    setClasses((c) => [...c, { id: crypto.randomUUID(), name: "", level: "", presetKey: def.key }]);
  };
  const updateClass = (id: string, patch: Partial<ClassDraft>) =>
    setClasses((cs) => cs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeClass = (id: string) => setClasses((cs) => cs.filter((c) => c.id !== id));

  const submit = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name: name.trim(),
          subsystem,
          address: address.trim() || undefined,
          motto: motto.trim() || undefined,
          yearLabel: yearLabel.trim(),
          classes: classes.map((c) => ({
            name: c.name.trim(),
            level: c.level.trim(),
            stream: c.stream?.trim() || undefined,
            presetKey: c.presetKey,
          })),
        },
      }),
    onSuccess: () => {
      toast.success("School created");
      navigate({ to: "/dashboard" });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to create school"),
  });

  const canNext1 = !!name.trim();
  const canNext2 = !!yearLabel.trim();
  const canSubmit = classes.length > 0 && classes.every((c) => c.name.trim() && c.level.trim());

  return (
    <div className="px-6 py-10 md:px-10">
      <header className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2 text-muted-foreground">
          <GraduationCap className="h-5 w-5 text-primary" />
          <p className="eyebrow">Setup wizard</p>
        </div>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">Set up your school</h1>
        <p className="mt-2 text-muted-foreground">
          Three short steps and you’ll be ready to enter marks and print bulletins.
        </p>

        <Steps current={step} />
      </header>

      <div className="mx-auto mt-10 max-w-3xl rounded-md border border-border bg-card p-7">
        {step === 1 && (
          <div className="space-y-6">
            <p className="eyebrow">Step 1 · Identity</p>
            <div>
              <Label>Which subsystem?</Label>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <SubsystemTile active={subsystem === "FR"} onClick={() => updateSubsystem("FR")} title="Francophone" sub="Trimestres · /20 · coefficients" />
                <SubsystemTile active={subsystem === "EN"} onClick={() => updateSubsystem("EN")} title="Anglophone" sub="Terms · /100 · positions" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">School name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={subsystem === "FR" ? "Lycée Bilingue de Yaoundé" : "Government Bilingual High School Buea"} maxLength={150} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addr">Address</Label>
              <Input id="addr" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="B.P. 1234, Yaoundé" maxLength={300} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="motto">Motto (optional)</Label>
              <Textarea id="motto" value={motto} onChange={(e) => setMotto(e.target.value)} placeholder="Travail – Discipline – Réussite" maxLength={200} rows={2} />
            </div>
            <NavRow onNext={() => setStep(2)} canNext={canNext1} />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <p className="eyebrow">Step 2 · Academic year</p>
            <div className="space-y-1.5">
              <Label htmlFor="year">Year label</Label>
              <Input id="year" value={yearLabel} onChange={(e) => setYearLabel(e.target.value)} placeholder={`${currentYear}–${currentYear + 1}`} maxLength={30} />
              <p className="text-xs text-muted-foreground">
                We’ll create three {subsystem === "FR" ? "trimestres" : "terms"} automatically.
              </p>
            </div>
            <NavRow onPrev={() => setStep(1)} onNext={() => setStep(3)} canNext={canNext2} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <p className="eyebrow">Step 3 · Classes</p>
            <p className="text-sm text-muted-foreground">
              Each class will be seeded with realistic subjects and coefficients you can edit later.
            </p>
            <div className="space-y-3">
              {classes.map((c, i) => {
                const subjects = presetSubjects(subsystem, c.presetKey);
                return (
                  <div key={c.id} className="rounded-md border border-border bg-background p-4">
                    <div className="flex items-center justify-between">
                      <p className="eyebrow">Class {i + 1}</p>
                      {classes.length > 1 && (
                        <button onClick={() => removeClass(c.id)} className="text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Class name</Label>
                        <Input value={c.name} onChange={(e) => updateClass(c.id, { name: e.target.value })} placeholder={subsystem === "FR" ? "3e A" : "Form 4 Sci"} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Level</Label>
                        <Input value={c.level} onChange={(e) => updateClass(c.id, { level: e.target.value })} placeholder={subsystem === "FR" ? "3e" : "Form 4"} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Stream / Série</Label>
                        <Input value={c.stream ?? ""} onChange={(e) => updateClass(c.id, { stream: e.target.value })} placeholder={subsystem === "FR" ? "Série D" : "Science"} />
                      </div>
                    </div>
                    <div className="mt-3 space-y-1.5">
                      <Label className="text-xs">Subject preset</Label>
                      <select
                        value={c.presetKey}
                        onChange={(e) => updateClass(c.id, { presetKey: e.target.value })}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {presetsForSubsystem.map((p) => (
                          <option key={p.key} value={p.key}>{p.label}</option>
                        ))}
                      </select>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {subjects.length} subjects · {subjects.slice(0, 4).map((s) => s.name).join(", ")}
                        {subjects.length > 4 ? "…" : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={addClass}
                className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-4 py-3 text-sm font-medium text-muted-foreground hover:border-secondary hover:text-foreground"
              >
                <Plus className="h-4 w-4" /> Add another class
              </button>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-4">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={submit.isPending}>
                <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => submit.mutate()} disabled={!canSubmit || submit.isPending} size="lg">
                {submit.isPending ? "Creating…" : "Create school"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Steps({ current }: { current: number }) {
  const labels = ["Identity", "Year", "Classes"];
  return (
    <ol className="mt-8 flex items-center gap-3 text-sm">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <li key={l} className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold tabular-nums ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : done
                  ? "border-secondary bg-secondary text-secondary-foreground"
                  : "border-border bg-background text-muted-foreground"
              }`}
            >
              {n}
            </span>
            <span className={active ? "font-medium text-foreground" : "text-muted-foreground"}>{l}</span>
            {n < 3 && <span className="ml-1 h-px w-8 bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}

function SubsystemTile({ active, onClick, title, sub }: { active: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border p-4 text-left transition-colors ${
        active ? "border-primary bg-primary/5" : "border-border bg-background hover:border-secondary"
      }`}
    >
      <p className="font-display text-lg font-semibold">{title}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </button>
  );
}

function NavRow({ onPrev, onNext, canNext }: { onPrev?: () => void; onNext: () => void; canNext: boolean }) {
  return (
    <div className="flex items-center justify-between border-t border-border pt-4">
      {onPrev ? (
        <Button variant="ghost" onClick={onPrev}>
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
        </Button>
      ) : (
        <div />
      )}
      <Button onClick={onNext} disabled={!canNext}>
        Continue <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    </div>
  );
}
