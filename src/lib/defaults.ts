// Seeded subject defaults per subsystem & level. Editable per class in the wizard.

import type { Subsystem } from "@/lib/grading";

export interface SubjectDefault {
  name: string;
  coefficient: number;
}

export const FR_COMMON_COLLEGE: SubjectDefault[] = [
  { name: "Français", coefficient: 4 },
  { name: "Anglais", coefficient: 2 },
  { name: "Mathématiques", coefficient: 4 },
  { name: "Physique-Chimie", coefficient: 3 },
  { name: "SVT", coefficient: 2 },
  { name: "Histoire-Géographie", coefficient: 2 },
  { name: "ECM", coefficient: 1 },
  { name: "EPS", coefficient: 1 },
  { name: "Informatique", coefficient: 1 },
];

export const FR_LYCEE_SERIE_D: SubjectDefault[] = [
  { name: "Mathématiques", coefficient: 5 },
  { name: "Physique-Chimie", coefficient: 5 },
  { name: "SVT", coefficient: 4 },
  { name: "Français", coefficient: 3 },
  { name: "Anglais", coefficient: 2 },
  { name: "Histoire-Géographie", coefficient: 2 },
  { name: "Philosophie", coefficient: 2 },
  { name: "EPS", coefficient: 1 },
];

export const FR_LYCEE_SERIE_A: SubjectDefault[] = [
  { name: "Français", coefficient: 5 },
  { name: "Philosophie", coefficient: 4 },
  { name: "Histoire-Géographie", coefficient: 4 },
  { name: "Anglais", coefficient: 3 },
  { name: "Espagnol / Allemand", coefficient: 2 },
  { name: "Mathématiques", coefficient: 2 },
  { name: "SVT", coefficient: 2 },
  { name: "EPS", coefficient: 1 },
];

export const FR_LYCEE_SERIE_C: SubjectDefault[] = [
  { name: "Mathématiques", coefficient: 7 },
  { name: "Physique-Chimie", coefficient: 5 },
  { name: "SVT", coefficient: 3 },
  { name: "Français", coefficient: 3 },
  { name: "Anglais", coefficient: 2 },
  { name: "Histoire-Géographie", coefficient: 2 },
  { name: "Philosophie", coefficient: 2 },
  { name: "EPS", coefficient: 1 },
];

export const EN_FORM_GENERAL: SubjectDefault[] = [
  { name: "English Language", coefficient: 1 },
  { name: "French", coefficient: 1 },
  { name: "Mathematics", coefficient: 1 },
  { name: "Biology", coefficient: 1 },
  { name: "Physics", coefficient: 1 },
  { name: "Chemistry", coefficient: 1 },
  { name: "History", coefficient: 1 },
  { name: "Geography", coefficient: 1 },
  { name: "Citizenship Education", coefficient: 1 },
  { name: "Computer Science", coefficient: 1 },
  { name: "Physical Education", coefficient: 1 },
];

export const EN_FORM_SCIENCE: SubjectDefault[] = [
  { name: "English Language", coefficient: 1 },
  { name: "Mathematics", coefficient: 1 },
  { name: "Biology", coefficient: 1 },
  { name: "Physics", coefficient: 1 },
  { name: "Chemistry", coefficient: 1 },
  { name: "French", coefficient: 1 },
  { name: "Further Mathematics", coefficient: 1 },
  { name: "Computer Science", coefficient: 1 },
  { name: "Physical Education", coefficient: 1 },
];

export const EN_LOWER_SIXTH_ARTS: SubjectDefault[] = [
  { name: "Literature in English", coefficient: 1 },
  { name: "History", coefficient: 1 },
  { name: "Geography", coefficient: 1 },
  { name: "Religious Studies", coefficient: 1 },
  { name: "French", coefficient: 1 },
  { name: "General Paper", coefficient: 1 },
];

export function presetSubjects(subsystem: Subsystem, key: string): SubjectDefault[] {
  if (subsystem === "FR") {
    if (key === "lycee-c") return FR_LYCEE_SERIE_C;
    if (key === "lycee-d") return FR_LYCEE_SERIE_D;
    if (key === "lycee-a") return FR_LYCEE_SERIE_A;
    return FR_COMMON_COLLEGE;
  }
  if (key === "form-science") return EN_FORM_SCIENCE;
  if (key === "ls-arts") return EN_LOWER_SIXTH_ARTS;
  return EN_FORM_GENERAL;
}

export const SUBSYSTEM_PRESETS: Record<Subsystem, { key: string; label: string }[]> = {
  FR: [
    { key: "college", label: "Collège (6e – 3e)" },
    { key: "lycee-a", label: "Lycée — Série A" },
    { key: "lycee-c", label: "Lycée — Série C" },
    { key: "lycee-d", label: "Lycée — Série D" },
  ],
  EN: [
    { key: "form-general", label: "Form 1 – 5 (General)" },
    { key: "form-science", label: "Form 4 – 5 (Science)" },
    { key: "ls-arts", label: "Lower / Upper Sixth (Arts)" },
  ],
};
