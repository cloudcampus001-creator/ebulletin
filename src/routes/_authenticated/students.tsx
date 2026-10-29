import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Users, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useSchool } from "@/lib/use-school";
import { listClasses } from "@/lib/classes.functions";

export const Route = createFileRoute("/_authenticated/students")({
  head: () => ({ meta: [{"title": "Students · Bulletin"}, {"name": "description", "content": "Manage student rosters by school class."}, {"property": "og:title", "content": "Students · Bulletin"}, {"property": "og:description", "content": "Manage student rosters by school class."}, {"property": "og:type", "content": "website"}, {"name": "twitter:card", "content": "summary"}, {"name": "robots", "content": "noindex"}] }),
  component: StudentsPage,
});

function StudentsPage() {
  const { school } = useSchool();
  const listFn = useServerFn(listClasses);
  const q = useQuery({ queryKey: ["classes", school?.id], queryFn: () => listFn({ data: { schoolId: school!.id } }), enabled: !!school?.id });
  const classes = q.data ?? [];
  return (
    <PageShell title="Students" subtitle={school?.name} eyebrow="Pick a class to manage its students">
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((c) => (
          <Link key={c.id} to="/classes/$classId" params={{ classId: c.id }} className="group block rounded-md border border-border bg-card p-5 transition-colors hover:border-secondary hover:bg-surface">
            <p className="eyebrow">{c.level}{c.stream ? ` · ${c.stream}` : ""}</p>
            <h3 className="mt-1 font-display text-xl font-semibold">{c.name}</h3>
            <p className="mt-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><Users className="h-3.5 w-3.5" /> {c.studentCount} students</p>
            <p className="mt-2 inline-flex items-center text-sm font-medium text-secondary">Manage <ArrowRight className="ml-1 h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" /></p>
          </Link>
        ))}
        {classes.length === 0 && <p className="text-muted-foreground">No classes yet. Create one under Classes.</p>}
      </div>
    </PageShell>
  );
}
