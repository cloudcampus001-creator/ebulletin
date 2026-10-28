export function validateRosterEntries(entries: { studentId: string; mark: number | null }[], studentIds: Set<string>, max: number) {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!studentIds.has(entry.studentId)) throw new Error("A student is not in the assigned class. Refresh and try again.");
    if (seen.has(entry.studentId)) throw new Error("Duplicate student entries are not allowed.");
    seen.add(entry.studentId);
    if (entry.mark !== null && (!Number.isFinite(entry.mark) || entry.mark < 0 || entry.mark > max)) {
      throw new Error(`Marks must be between 0 and ${max}.`);
    }
  }
}