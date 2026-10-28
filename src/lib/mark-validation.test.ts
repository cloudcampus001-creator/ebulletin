import { describe, it, expect } from "vitest";
import { validateRosterEntries } from "./mark-validation";
describe("assigned-class marks", () => {
  const roster = new Set(["student-a"]);
  it("rejects students outside the assigned class", () => {
    expect(() => validateRosterEntries([{ studentId: "student-b", mark: 10 }], roster, 20)).toThrow();
  });
  it("enforces FR marks out of 20", () => {
    expect(() => validateRosterEntries([{ studentId: "student-a", mark: 20 }], roster, 20)).not.toThrow();
    expect(() => validateRosterEntries([{ studentId: "student-a", mark: 21 }], roster, 20)).toThrow();
  });
  it("enforces EN marks out of 100", () => {
    expect(() => validateRosterEntries([{ studentId: "student-a", mark: 100 }], roster, 100)).not.toThrow();
    expect(() => validateRosterEntries([{ studentId: "student-a", mark: 101 }], roster, 100)).toThrow();
  });
  it("rejects duplicate students", () => {
    expect(() => validateRosterEntries([{ studentId: "student-a", mark: 10 }, { studentId: "student-a", mark: 12 }], roster, 20)).toThrow();
  });
});