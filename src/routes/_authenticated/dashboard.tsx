import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { listMySchools, getSchoolSummary } from "@/lib/schools.functions";
import { BookOpen, Users, FileText, Plus, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · Bulletin" }, { name: "robots", content: "noindex" }] }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const listFn = useServerFn(listMySchools);
  const summaryFn = useServerFn(getSchoolSummary);

  const schoolsQ = useQuery({
    queryKey: ["my-schools"],
    queryFn: () => listFn(),
  });

  const schools = schoolsQ.data ?? [];
  const firstSchool = schools[0];

  useEffect(() => {
    if (schoolsQ.isSuccess && schools.length === 0) {
      navigate({ to: "/setup" });
    }
  }, [schoolsQ.isSuccess, schools.length, navigate]);

  const summaryQ = useQuery({
    queryKey: ["school-summary", firstSchool?.id],
    queryFn: () => summaryFn({ data: { schoolId: firstSchool!.id } }),
    enabled: !!firstSchool?.id,
  });

  if (schoolsQ.isLoading) return <PageShell title="Dashboard"><Skeleton /></PageShell>;
  if (!firstSchool) return null;

  const summary = summaryQ.data;

  return (
    <PageShell
      title="Dashboard"
      subtitle={firstSchool.name}
      eyebrow={firstSchool.subsystem === "FR" ? "Sous-système francophone" : "Anglophone subsystem"}
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Stat icon={BookOpen} label="Classes" value={summary?.classes.length ?? "—"} />
        <Stat icon={Users} label="Students" value={summary?.studentCount ?? "—"} />
        <Stat icon={FileText} label="Academic year" value={summary?.years[0]?.label ?? "—"} />
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between">
          <div>
            <p className="eyebrow">Your classes</p>
            <h2 className="mt-1 font-display text-2xl font-semibold">Pick a class to enter marks</h2>
          </div>
          <Link
            to="/classes"
            className="inline-flex h-9 items-center gap-1 rounded-md border border-border px-3 text-sm font-medium hover:bg-surface"
          >
            Manage classes <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {summary?.classes.map((c) => (
            <Link
              key={c.id}
              to={"/classes/$classId" as never}
              params={{ classId: c.id } as never}
              className="group block rounded-md border border-border bg-card p-5 transition-colors hover:border-secondary hover:bg-surface"
            >
              <p className="eyebrow">{c.level}{c.stream ? ` · ${c.stream}` : ""}</p>
              <h3 className="mt-2 font-display text-xl font-semibold">{c.name}</h3>
              <p className="mt-3 inline-flex items-center text-sm font-medium text-secondary">
                Enter marks <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Link>
          ))}
          <Link
            to="/setup"
            className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-background p-6 text-sm font-medium text-muted-foreground transition-colors hover:border-secondary hover:text-foreground"
          >
            <Plus className="mb-2 h-5 w-5" />
            Add another class
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <p className="font-display text-2xl font-semibold tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Skeleton() {
  return <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-md bg-muted" />)}</div>;
}

export function PageShell({
  title,
  subtitle,
  eyebrow,
  children,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-6 py-8 md:px-10 md:py-10">
      <div className="border-b border-border pb-6">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="mt-8">{children}</div>
    </div>
  );
}
