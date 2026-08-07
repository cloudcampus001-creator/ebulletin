import { createFileRoute, Link } from "@tanstack/react-router";
import { GraduationCap, FileText, Calculator, Languages, Printer, Users } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bulletin — Generate Cameroon School Report Cards" },
      {
        name: "description",
        content:
          "Multi-tenant SaaS for Cameroonian secondary schools. Generate official bulletins (Francophone) and report cards (Anglophone) — automatic averages, ranks, and print-ready PDFs.",
      },
      { property: "og:title", content: "Bulletin — Cameroon Report Card Generator" },
      {
        property: "og:description",
        content:
          "Replace Excel and Word. Enter marks once, print authentic bulletins for every student in a class.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <Hero />
      <Subsystems />
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="border-b border-border bg-background/80 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className="font-display text-lg font-semibold tracking-tight">Bulletin</span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#subsystems" className="hover:text-foreground">Subsystems</a>
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            to="/auth"
            className="inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-foreground hover:bg-surface"
          >
            Sign in
          </Link>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-secondary"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div className="container-page grid gap-12 py-20 md:grid-cols-[1.1fr_1fr] md:py-28">
        <div>
          <p className="eyebrow">République du Cameroun · Republic of Cameroon</p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight md:text-6xl">
            Bulletins &amp; report cards your principal will trust.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            One tool for both Cameroonian school subsystems. Enter marks once — get
            weighted moyennes, ranks, appréciations, and print-ready PDFs that look like
            the bulletin you already use.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-secondary"
            >
              Set up your school
            </Link>
            <a
              href="#how"
              className="inline-flex h-11 items-center rounded-md border border-border bg-background px-6 text-sm font-medium hover:bg-surface"
            >
              See how it works
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-2"><Languages className="h-4 w-4 text-secondary" /> FR &amp; EN subsystems</span>
            <span className="flex items-center gap-2"><Calculator className="h-4 w-4 text-secondary" /> Auto moyennes &amp; ranks</span>
            <span className="flex items-center gap-2"><Printer className="h-4 w-4 text-secondary" /> Print-ready PDF</span>
          </div>
        </div>

        <BulletinPreview />
      </div>
    </section>
  );
}

function BulletinPreview() {
  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 translate-x-3 translate-y-3 rounded-md bg-secondary/20" />
      <div className="rounded-md border border-border bg-card p-7 shadow-paper">
        <div className="flex items-start justify-between gap-4 border-b border-border pb-3">
          <div>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
              RÉPUBLIQUE DU CAMEROUN
            </p>
            <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">
              REPUBLIC OF CAMEROON
            </p>
            <p className="mt-1 text-[10px] italic text-muted-foreground">
              Paix · Travail · Patrie / Peace · Work · Fatherland
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-sm font-semibold">Lycée Bilingue de Yaoundé</p>
            <p className="text-[10px] text-muted-foreground">B.P. 1234 · Yaoundé</p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-[11px]">
          <span><span className="text-muted-foreground">Élève :</span> <b>NDONGO Marie</b></span>
          <span><span className="text-muted-foreground">Classe :</span> <b>3<sup>e</sup> A</b></span>
          <span><span className="text-muted-foreground">Trimestre :</span> <b>1</b></span>
        </div>

        <table className="mt-4 w-full border-collapse text-[11px]">
          <thead>
            <tr className="border-y border-foreground/60 text-[10px] uppercase tracking-wider text-foreground">
              <th className="py-1.5 text-left font-semibold">Matière</th>
              <th className="py-1.5 text-right font-semibold">Note/20</th>
              <th className="py-1.5 text-right font-semibold">Coef</th>
              <th className="py-1.5 text-right font-semibold">Moy. cl.</th>
              <th className="py-1.5 text-right font-semibold">Rang</th>
            </tr>
          </thead>
          <tbody>
            {[
              ["Mathématiques", "15.50", "4", "11.20", "2"],
              ["Français", "14.00", "4", "12.10", "5"],
              ["Physique-Chimie", "16.25", "3", "10.80", "1"],
              ["Anglais", "13.75", "2", "12.40", "7"],
              ["Histoire-Géo", "12.00", "2", "11.50", "9"],
              ["SVT", "14.50", "2", "11.90", "3"],
            ].map((r) => (
              <tr key={r[0]} className="border-b border-border/60">
                <td className="py-1.5">{r[0]}</td>
                <td className="py-1.5 text-right tabular-nums">{r[1]}</td>
                <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r[2]}</td>
                <td className="py-1.5 text-right tabular-nums text-muted-foreground">{r[3]}</td>
                <td className="py-1.5 text-right tabular-nums">{r[4]}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 grid grid-cols-3 gap-3 border-t border-foreground/60 pt-3 text-[11px]">
          <div>
            <p className="text-muted-foreground">Moyenne</p>
            <p className="font-display text-2xl font-semibold tabular-nums">14.62</p>
          </div>
          <div>
            <p className="text-muted-foreground">Rang général</p>
            <p className="font-display text-2xl font-semibold tabular-nums">3<sup className="text-xs">e</sup></p>
          </div>
          <div>
            <p className="text-muted-foreground">Appréciation</p>
            <p className="font-display text-lg font-semibold text-secondary">Très Bien</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Subsystems() {
  return (
    <section id="subsystems" className="border-b border-border bg-surface">
      <div className="container-page py-20">
        <p className="eyebrow text-center">One platform, two subsystems</p>
        <h2 className="mx-auto mt-3 max-w-3xl text-center font-display text-4xl font-semibold tracking-tight">
          Built around how Cameroonian schools actually work.
        </h2>
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <SubsystemCard
            badge="Francophone"
            title="Sous-système francophone"
            items={[
              "3 Trimestres par année scolaire",
              "Notes sur /20 avec coefficients par matière",
              "Moyenne pondérée, rang, appréciation auto",
              "Collège (6e – 3e) et Lycée (Séries A, C, D, TI…)",
              "Conseil de classe et décision de fin d'année",
            ]}
          />
          <SubsystemCard
            badge="Anglophone"
            title="Anglophone subsystem"
            items={[
              "3 Terms per academic year",
              "Marks out of /100, letter or GCE-style grades",
              "Class average, position, teacher remarks",
              "Forms 1–5 (O-Level) and Lower / Upper Sixth (A-Level)",
              "Class teacher &amp; principal remarks, promotion decision",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function SubsystemCard({ badge, title, items }: { badge: string; title: string; items: string[] }) {
  return (
    <div className="rounded-md border border-border bg-card p-8">
      <span className="eyebrow inline-block rounded border border-border bg-surface px-2 py-1 text-foreground">
        {badge}
      </span>
      <h3 className="mt-4 font-display text-2xl font-semibold">{title}</h3>
      <ul className="mt-5 space-y-2.5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className="mt-2 inline-block h-[3px] w-3 shrink-0 bg-secondary" />
            <span dangerouslySetInnerHTML={{ __html: i }} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Features() {
  const items = [
    { icon: Calculator, title: "Calculation engine", body: "Weighted moyennes, per-subject class averages, rank per subject and overall — recomputed automatically as marks are entered." },
    { icon: FileText, title: "Print-ready PDFs", body: "Server-rendered bulletins with the bilingual national header, your school logo, and the official field grid teachers and parents expect." },
    { icon: Users, title: "Role-based access", body: "Proprietor, Chef d’établissement, Professeur Principal, and subject teachers each see only what they should." },
    { icon: Languages, title: "FR / EN labels", body: "Term names, grading scale, field labels and PDF template switch based on the subsystem you pick at setup." },
    { icon: Printer, title: "Batch export", body: "Generate a PDF per student for an entire class in one click — zipped and ready for the print shop." },
    { icon: GraduationCap, title: "Customizable subjects", body: "Seeded with realistic defaults for Collège, Séries A/C/D, Forms 1–5 and Lower/Upper Sixth — edit coefficients per class." },
  ];
  return (
    <section id="features" className="border-b border-border">
      <div className="container-page py-20">
        <p className="eyebrow">What’s inside</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight">
          Everything a Cameroonian secondary school needs at term-end.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
          {items.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-background p-7">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", title: "Set up your school", body: "Pick Francophone or Anglophone, upload your logo, add classes — start from a seeded subject list with realistic coefficients, then edit." },
    { n: "02", title: "Add students &amp; staff", body: "Type them in or import a CSV. Assign class teachers and subject teachers; each only sees what they’re responsible for." },
    { n: "03", title: "Enter marks", body: "A spreadsheet-style grid per class, subject, and term. Mobile-friendly — many teachers will enter from a phone." },
    { n: "04", title: "Print bulletins", body: "Click once for a single student, or batch-export the entire class as a zip of PDFs ready for the print shop." },
  ];
  return (
    <section id="how" className="border-b border-border bg-surface">
      <div className="container-page py-20">
        <p className="eyebrow">From zero to printed bulletin in 15 minutes</p>
        <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight">
          A workflow that matches a Cameroonian school’s term-end.
        </h2>
        <div className="mt-12 grid gap-px overflow-hidden rounded-md border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="bg-background p-7">
              <p className="font-display text-3xl font-semibold text-secondary tabular-nums">{s.n}</p>
              <h3 className="mt-4 font-display text-lg font-semibold" dangerouslySetInnerHTML={{ __html: s.title }} />
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground" dangerouslySetInnerHTML={{ __html: s.body }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-b border-border">
      <div className="container-page py-20 text-center">
        <h2 className="mx-auto max-w-3xl font-display text-4xl font-semibold tracking-tight">
          The next bulletin you sign should be one you printed yourself.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Create your school account and have a sample bulletin in your hands in under 15 minutes.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="inline-flex h-11 items-center rounded-md bg-primary px-7 text-sm font-medium text-primary-foreground hover:bg-secondary"
          >
            Get started
          </Link>
          <Link
            to="/auth"
            className="inline-flex h-11 items-center rounded-md border border-border bg-background px-7 text-sm font-medium hover:bg-surface"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-background">
      <div className="container-page flex flex-col items-start justify-between gap-4 py-10 text-sm text-muted-foreground md:flex-row md:items-center">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <span className="font-display text-base font-semibold text-foreground">Bulletin</span>
        </div>
        <p>© {new Date().getFullYear()} Bulletin · Made for Cameroonian schools.</p>
      </div>
    </footer>
  );
}
