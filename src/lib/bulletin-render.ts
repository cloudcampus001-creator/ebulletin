// Server-side report-card document builder.
// Produces a fully self-contained, print-ready HTML document string.
// Fonts (Fraunces display + Inter body) match the landing page exactly.
import {
  computeClass,
  appreciate,
  type GradeBand,
} from "@/lib/grading";

export interface BulletinDoc {
  school: {
    name: string;
    logo_url: string | null;
    subsystem: string;
    address: string | null;
    motto: string | null;
    grade_bands: GradeBand[] | null;
  };
  class: { id: string; name: string; level: string | null; stream: string | null };
  sequence: { id: string; name: string; term: string | null } | null;
  subjects: { id: string; name: string; coefficient: number; display_order?: number | null }[];
  students: {
    id: string;
    matricule: string | null;
    last_name: string;
    first_name: string | null;
    sex: string | null;
    date_of_birth: string | null;
  }[];
  grades: { studentId: string; subjectId: string; mark: number | null }[];
  conduct: {
    student_id: string;
    conduct: string | null;
    absences_justified: number | null;
    absences_unjustified: number | null;
  }[];
  remarks: {
    student_id: string;
    class_teacher_remark: string | null;
    principal_remark: string | null;
    council_decision: string | null;
  }[];
}

function esc(v: unknown): string {
  if (v == null) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmt(n: number | null | undefined, digits = 2): string {
  if (n == null || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

const ORD = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function renderBulletinDocument(
  d: BulletinDoc,
  opts: { bands: GradeBand[]; max: number; fr: boolean },
): string {
  const { bands, max, fr } = opts;
  const subjects = [...d.subjects].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
  );
  const computed = computeClass(d.students, subjects, d.grades);
  const conductMap = new Map(d.conduct.map((c) => [c.student_id, c]));
  const remarkMap = new Map(d.remarks.map((r) => [r.student_id, r]));
  const headerNation = fr ? "République du Cameroun" : "Republic of Cameroon";
  const headerSub = fr ? "Republic of Cameroon" : "République du Cameroun";
  const motto = fr ? "Paix · Travail · Patrie" : "Peace · Work · Fatherland";
  const t = {
    student: fr ? "Élève" : "Student",
    id: fr ? "Matricule" : "Reg. No.",
    sex: fr ? "Sexe" : "Sex",
    dob: fr ? "Né(e) le" : "Date of birth",
    enrolled: fr ? "Effectif" : "Class size",
    subject: fr ? "Matière" : "Subject",
    mark: fr ? "Note" : "Mark",
    coef: fr ? "Coef" : "Coef",
    total: fr ? "Note × Coef" : "Mark × Coef",
    classAvg: fr ? "Moy. Cl." : "Class Avg",
    rank: fr ? "Rang" : "Pos.",
    remark: fr ? "Appréciation" : "Remark",
    totals: fr ? "TOTAUX" : "TOTALS",
    average: fr ? "Moyenne" : "Average",
    overall: fr ? "Rang général" : "Overall Position",
    grade: fr ? "Mention" : "Grade",
    conduct: fr ? "Conduite" : "Conduct",
    absJust: fr ? "Abs. just." : "Abs. (excused)",
    absUnjust: fr ? "Abs. non just." : "Abs. (unexcused)",
    classTeacher: fr ? "Professeur principal" : "Class Teacher",
    principal: fr ? "Le Chef d'Établissement" : "The Principal",
    council: fr ? "Décision du conseil" : "Council Decision",
    seqResult: fr ? "Résultat de la séquence" : "Sequence Result",
  };

  const pages = d.students
    .map((st) => {
      const tot = computed.totals[st.id];
      const cond = conductMap.get(st.id);
      const rem = remarkMap.get(st.id);
      const overall = computed.overallRank[st.id];

      const rows = subjects
        .map((su) => {
          const ss = computed.subjects[su.id];
          const cell = ss.perStudent[st.id];
          const mark = cell?.mark ?? null;
          const low = mark != null && mark < max / 2;
          return `<tr>
            <td class="l">${esc(su.name)}</td>
            <td class="c num ${low ? "low" : ""}">${mark == null ? "—" : fmt(mark, mark % 1 === 0 ? 0 : 2)}</td>
            <td class="c num">${esc(su.coefficient)}</td>
            <td class="c num">${mark == null ? "—" : fmt(mark * su.coefficient, 1)}</td>
            <td class="c num soft">${fmt(ss.classAverage)}</td>
            <td class="c num">${cell?.rank ?? "—"}</td>
            <td class="l soft">${esc(appreciate(mark, bands))}</td>
          </tr>`;
        })
        .join("");

      return `<article class="page">
        <header class="hd">
          <div class="hd-l">
            ${d.school.logo_url ? `<img class="logo" src="${esc(d.school.logo_url)}" alt="" />` : `<div class="logo logo-ph">${esc((d.school.name || "S").slice(0, 1).toUpperCase())}</div>`}
            <div>
              <p class="nation">${esc(headerNation)}</p>
              <p class="nation sub">${esc(headerSub)}</p>
              <p class="motto">${esc(motto)}</p>
            </div>
          </div>
          <div class="hd-r">
            <h1 class="sname">${esc(d.school.name)}</h1>
            ${d.school.address ? `<p class="saddr">${esc(d.school.address)}</p>` : ""}
            ${d.school.motto ? `<p class="smotto">${esc(d.school.motto)}</p>` : ""}
          </div>
        </header>

        <div class="title-band">
          <span>${esc(d.sequence?.name ?? "")}</span>
          ${d.sequence?.term ? `<span class="dot">•</span><span>${esc(d.sequence.term)}</span>` : ""}
          <span class="dot">•</span><span>${esc(d.class.name)}</span>
        </div>

        <section class="ident">
          <div><span class="k">${t.student}</span><span class="v strong">${esc(st.last_name)} ${esc(st.first_name ?? "")}</span></div>
          ${st.matricule ? `<div><span class="k">${t.id}</span><span class="v">${esc(st.matricule)}</span></div>` : ""}
          ${st.sex ? `<div><span class="k">${t.sex}</span><span class="v">${esc(st.sex)}</span></div>` : ""}
          ${st.date_of_birth ? `<div><span class="k">${t.dob}</span><span class="v">${esc(st.date_of_birth)}</span></div>` : ""}
          <div><span class="k">${t.enrolled}</span><span class="v">${d.students.length}</span></div>
        </section>

        <table class="grid">
          <thead>
            <tr>
              <th class="l">${t.subject}</th>
              <th class="c">${t.mark}/${max}</th>
              <th class="c">${t.coef}</th>
              <th class="c">${t.total}</th>
              <th class="c">${t.classAvg}</th>
              <th class="c">${t.rank}</th>
              <th class="l">${t.remark}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr>
              <td class="l strong">${t.totals}</td>
              <td></td>
              <td class="c num strong">${tot.totalCoefficient}</td>
              <td class="c num strong">${fmt(tot.totalPoints, 1)}</td>
              <td colspan="3"></td>
            </tr>
          </tfoot>
        </table>

        <section class="summary">
          <div class="box"><p class="bl">${t.average}</p><p class="bv">${tot.average == null ? "—" : fmt(tot.average)}<span class="bvs">/${max}</span></p></div>
          <div class="box"><p class="bl">${t.overall}</p><p class="bv">${overall ? ORD(overall) : "—"}<span class="bvs"> / ${d.students.length}</span></p></div>
          <div class="box accent"><p class="bl">${t.grade}</p><p class="bv sm">${esc(appreciate(tot.average, bands))}</p></div>
        </section>

        <section class="meta">
          <div class="meta-row">
            <span class="k">${t.conduct}</span><span class="v">${esc(cond?.conduct ?? "—")}</span>
            <span class="k">${t.absJust}</span><span class="v">${cond?.absences_justified ?? 0}</span>
            <span class="k">${t.absUnjust}</span><span class="v">${cond?.absences_unjustified ?? 0}</span>
          </div>
          ${rem?.class_teacher_remark ? `<div class="rem"><span class="k">${t.classTeacher}</span><span class="v">${esc(rem.class_teacher_remark)}</span></div>` : ""}
          ${rem?.principal_remark ? `<div class="rem"><span class="k">${t.principal}</span><span class="v">${esc(rem.principal_remark)}</span></div>` : ""}
          ${rem?.council_decision ? `<div class="rem"><span class="k">${t.council}</span><span class="v strong">${esc(rem.council_decision)}</span></div>` : ""}
        </section>

        <footer class="sign">
          <div><p class="sk">${t.classTeacher}</p><div class="sline"></div></div>
          <div class="seal">${d.school.logo_url ? `<img src="${esc(d.school.logo_url)}" alt="" />` : ""}</div>
          <div class="right"><p class="sk">${t.principal}</p><div class="sline"></div></div>
        </footer>
      </article>`;
    })
    .join("");

  const titleClass = `${esc(d.class.name)} — ${esc(d.sequence?.name ?? "")}`;

  return `<!doctype html>
<html lang="${fr ? "fr" : "en"}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(d.school.name)} — ${titleClass}</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  :root{
    --navy:#0B2545; --navy2:#13315C; --gold:#C99A3A; --ink:#1A1D26;
    --soft:#5B6472; --line:#D7DCE3; --line2:#9AA6B5; --bg:#FAF8F2; --paper:#fff; --low:#B23A2E;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  html{font-family:"Inter",system-ui,sans-serif;color:var(--ink);background:var(--bg);}
  body{padding:24px 16px;}
  h1,.disp{font-family:"Fraunces",Georgia,serif;letter-spacing:-0.01em;}
  .toolbar{max-width:800px;margin:0 auto 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;}
  .toolbar p{font-size:13px;color:var(--soft);}
  .btn{font-family:"Inter",sans-serif;font-size:14px;font-weight:500;color:#fff;background:var(--navy);border:none;border-radius:6px;padding:10px 20px;cursor:pointer;}
  .btn:hover{background:var(--navy2);}
  .page{
    max-width:800px;margin:0 auto 28px;background:var(--paper);color:var(--ink);
    padding:34px 38px;border:1px solid var(--line);border-radius:8px;
    box-shadow:0 8px 28px -18px rgba(11,37,69,0.35);position:relative;
  }
  .hd{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;padding-bottom:14px;border-bottom:2px solid var(--navy);}
  .hd-l{display:flex;gap:14px;align-items:center;}
  .logo{height:64px;width:64px;object-fit:contain;border-radius:6px;}
  .logo-ph{display:flex;align-items:center;justify-content:center;background:var(--navy);color:#fff;font-family:"Fraunces",serif;font-size:30px;font-weight:600;}
  .nation{font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:var(--navy);}
  .nation.sub{color:var(--soft);font-weight:600;}
  .motto{font-size:10px;font-style:italic;color:var(--soft);margin-top:3px;}
  .hd-r{text-align:right;}
  .sname{font-size:22px;font-weight:600;color:var(--navy);line-height:1.1;}
  .saddr{font-size:11px;color:var(--soft);margin-top:4px;}
  .smotto{font-size:10px;font-style:italic;color:var(--gold);margin-top:2px;}
  .title-band{margin-top:14px;display:flex;align-items:center;justify-content:center;gap:8px;background:var(--navy);color:#fff;border-radius:5px;padding:7px 14px;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;}
  .title-band .dot{opacity:0.5;}
  .ident{margin-top:16px;display:flex;flex-wrap:wrap;gap:10px 26px;font-size:12.5px;}
  .ident .k{color:var(--soft);margin-right:6px;}
  .ident .v.strong,.strong{font-weight:600;}
  .grid{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px;}
  .grid th{background:var(--navy);color:#fff;font-weight:600;font-size:10.5px;letter-spacing:0.04em;text-transform:uppercase;padding:7px 8px;border:1px solid var(--navy);}
  .grid td{padding:6px 8px;border:1px solid var(--line);}
  .grid tbody tr:nth-child(even){background:#F6F8FB;}
  .grid .l{text-align:left;}
  .grid .c{text-align:center;}
  .grid .num{font-variant-numeric:tabular-nums;}
  .grid .soft{color:var(--soft);}
  .grid .low{color:var(--low);font-weight:600;}
  .grid tfoot td{background:#EEF2F7;border:1px solid var(--line2);font-size:12px;}
  .summary{margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
  .box{border:1px solid var(--line2);border-radius:6px;padding:10px 14px;text-align:center;}
  .box.accent{background:var(--navy);border-color:var(--navy);}
  .box.accent .bl,.box.accent .bv{color:#fff;}
  .bl{font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:var(--soft);}
  .bv{font-family:"Fraunces",serif;font-size:26px;font-weight:600;margin-top:2px;font-variant-numeric:tabular-nums;}
  .bv.sm{font-size:18px;}
  .bvs{font-size:13px;color:var(--soft);font-weight:500;}
  .box.accent .bvs{color:rgba(255,255,255,0.7);}
  .meta{margin-top:16px;border:1px solid var(--line);border-radius:6px;padding:12px 14px;font-size:12px;}
  .meta-row{display:flex;flex-wrap:wrap;gap:6px 22px;align-items:center;padding-bottom:8px;border-bottom:1px dashed var(--line);}
  .meta .k{color:var(--soft);}
  .meta .v{font-weight:600;margin-right:8px;}
  .rem{margin-top:8px;display:flex;gap:8px;}
  .rem .k{min-width:140px;color:var(--soft);}
  .sign{margin-top:26px;display:flex;justify-content:space-between;align-items:flex-end;gap:18px;}
  .sk{font-size:11px;font-weight:600;color:var(--navy);}
  .sline{margin-top:30px;width:150px;border-top:1px solid var(--ink);}
  .sign .right{text-align:right;}
  .sign .right .sline{margin-left:auto;}
  .seal{opacity:0.12;}
  .seal img{height:80px;width:80px;object-fit:contain;}
  @media print{
    @page{size:A4;margin:12mm;}
    body{padding:0;background:#fff;}
    .toolbar{display:none;}
    .page{box-shadow:none;border:none;margin:0;max-width:none;padding:0;page-break-after:always;}
    .page:last-child{page-break-after:auto;}
  }
</style>
</head>
<body>
  <div class="toolbar">
    <p>${d.students.length} report card${d.students.length === 1 ? "" : "s"} • ${esc(d.class.name)} • ${esc(d.sequence?.name ?? "")}</p>
    <button class="btn" onclick="window.print()">Print / Save as PDF</button>
  </div>
  ${pages || `<div class="page"><p style="text-align:center;color:#5B6472;">No students in this class yet.</p></div>`}
  <script>window.addEventListener("load",function(){setTimeout(function(){try{window.focus();}catch(e){}},300);});</script>
</body>
</html>`;
}
