import { describe, it, expect } from "vitest";
import { convertMark } from "./index";
describe("convertMark", () => {
  it("15/30 becomes 10/20", () => expect(convertMark(15, 30)).toBe(10));
  it("default total 20 keeps mark", () => expect(convertMark(14.5, 20)).toBe(14.5));
  it("7/40 becomes 3.5/20", () => expect(convertMark(7, 40)).toBe(3.5));
});
