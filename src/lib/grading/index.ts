// Grading & ranking engine — pure functions, shared by FR and EN subsystems.

export type Subsystem = "FR" | "EN";

export interface GradeInput {
  studentId: string;
  subjectId: string;
  mark: number | null;
}

export interface SubjectInput {
  id: string;
  name: string;
  coefficient: number;
}

export interface StudentTotals {
  studentId: string;
  totalPoints: number;        // Σ(mark × coef)
  totalCoefficient: number;   // Σ(coef) for graded subjects
  average: number | null;     // weighted average; null if no grades
}

export interface SubjectStats {
  subjectId: string;
  classAverage: number | null;
  perStudent: Record<string, { mark: number | null; rank: number | null }>;
}

export interface ClassComputation {
  totals: Record<string, StudentTotals>;
  overallRank: Record<string, number>;
  subjects: Record<string, SubjectStats>;
}

/**
 * Compute per-student weighted averages, per-subject class averages and ranks,
 * and overall class rank. Works identically for /20 (FR) and /100 (EN).
 */
export function computeClass(
  students: { id: string }[],
  subjects: SubjectInput[],
  grades: GradeInput[],
): ClassComputation {
  const byStudent = new Map<string, GradeInput[]>();
  for (const s of students) byStudent.set(s.id, []);
  for (const g of grades) {
    if (!byStudent.has(g.studentId)) byStudent.set(g.studentId, []);
    byStudent.get(g.studentId)!.push(g);
  }

  const subjectCoef = new Map(subjects.map((s) => [s.id, s.coefficient]));

  const totals: Record<string, StudentTotals> = {};
  for (const s of students) {
    let totalPoints = 0;
    let totalCoef = 0;
    for (const g of byStudent.get(s.id) ?? []) {
      if (g.mark == null || Number.isNaN(g.mark)) continue;
      const c = subjectCoef.get(g.subjectId) ?? 1;
      totalPoints += g.mark * c;
      totalCoef += c;
    }
    totals[s.id] = {
      studentId: s.id,
      totalPoints,
      totalCoefficient: totalCoef,
      average: totalCoef > 0 ? totalPoints / totalCoef : null,
    };
  }

  // Overall rank
  const ordered = [...students]
    .map((s) => ({ id: s.id, avg: totals[s.id].average }))
    .sort((a, b) => (b.avg ?? -Infinity) - (a.avg ?? -Infinity));
  const overallRank: Record<string, number> = {};
  ordered.forEach((o, i) => {
    overallRank[o.id] = o.avg == null ? 0 : i + 1;
  });

  // Per-subject stats
  const subjectStats: Record<string, SubjectStats> = {};
  for (const subj of subjects) {
    const subjectGrades = grades.filter((g) => g.subjectId === subj.id);
    const marks = subjectGrades
      .map((g) => g.mark)
      .filter((m): m is number => m != null && !Number.isNaN(m));
    const classAverage =
      marks.length > 0 ? marks.reduce((a, b) => a + b, 0) / marks.length : null;

    const sorted = [...subjectGrades]
      .filter((g) => g.mark != null)
      .sort((a, b) => (b.mark ?? -Infinity) - (a.mark ?? -Infinity));
    const perStudent: SubjectStats["perStudent"] = {};
    for (const s of students) {
      const g = subjectGrades.find((x) => x.studentId === s.id);
      const idx = sorted.findIndex((x) => x.studentId === s.id);
      perStudent[s.id] = {
        mark: g?.mark ?? null,
        rank: idx >= 0 ? idx + 1 : null,
      };
    }
    subjectStats[subj.id] = { subjectId: subj.id, classAverage, perStudent };
  }

  return { totals, overallRank, subjects: subjectStats };
}

export interface GradeBand {
  min: number;
  label: string;
}

export const DEFAULT_FR_BANDS: GradeBand[] = [
  { min: 16, label: "Excellent" },
  { min: 14, label: "Très Bien" },
  { min: 12, label: "Bien" },
  { min: 10, label: "Assez Bien" },
  { min: 8, label: "Passable" },
  { min: 0, label: "Insuffisant" },
];

export const DEFAULT_EN_BANDS: GradeBand[] = [
  { min: 80, label: "A — Excellent" },
  { min: 70, label: "B — Very Good" },
  { min: 60, label: "C — Good" },
  { min: 50, label: "D — Pass" },
  { min: 40, label: "E — Weak" },
  { min: 0, label: "F — Fail" },
];

export function appreciate(mark: number | null, bands: GradeBand[]): string {
  if (mark == null) return "—";
  for (const b of bands) if (mark >= b.min) return b.label;
  return bands[bands.length - 1].label;
}

export function defaultBands(subsystem: Subsystem): GradeBand[] {
  return subsystem === "FR" ? DEFAULT_FR_BANDS : DEFAULT_EN_BANDS;
}

export function maxMark(subsystem: Subsystem): number {
  return subsystem === "FR" ? 20 : 100;
}

export function termLabel(subsystem: Subsystem, index: number): string {
  if (subsystem === "FR") return ["Trimestre 1", "Trimestre 2", "Trimestre 3"][index - 1] ?? `Trimestre ${index}`;
  return ["First Term", "Second Term", "Third Term"][index - 1] ?? `Term ${index}`;
}

/** Global sequence index (1..6) → label. Cameroon: 2 sequences per term. */
export function sequenceLabel(subsystem: Subsystem, index: number): string {
  if (subsystem === "FR") return `Séquence ${index}`;
  return `Sequence ${index}`;
}

/** Which term (1..3) a global sequence index (1..6) belongs to. */
export function termOfSequence(index: number): number {
  return Math.ceil(index / 2);
}

/** Convert a mark entered out of `outOf` to the report-card scale `target` (default 20), rounded to 2 decimals. */
export function convertMark(raw: number, outOf: number, target = 20): number {
  if (!(outOf > 0)) throw new Error("Total must be greater than 0");
  return Math.round((raw * target / outOf) * 100) / 100;
}
