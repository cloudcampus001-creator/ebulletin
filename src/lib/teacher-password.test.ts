import { describe, it, expect } from "vitest";
import { pbkdf2Sync } from "node:crypto";
import { hashPassword, verifyPassword } from "./teacher-password";

describe("teacher passwords", () => {
  it("creates compatible 120000-round hashes", () => {
    const stored = hashPassword("Presentation-test-123");
    const [, rounds, salt, hash] = stored.split("$");
    expect(Number(rounds)).toBe(120000);
    expect(hash).toBe(pbkdf2Sync("Presentation-test-123", salt, 120000, 32, "sha256").toString("hex"));
    expect(verifyPassword("Presentation-test-123", stored)).toBe(true);
    expect(verifyPassword("wrong", stored)).toBe(false);
  });
  it("accepts pre-existing hashes without resetting teacher accounts", () => {
    const salt = "0123456789abcdef0123456789abcdef";
    const hash = pbkdf2Sync("Existing-password", salt, 120000, 32, "sha256").toString("hex");
    expect(verifyPassword("Existing-password", `pbkdf2$120000$${salt}$${hash}`)).toBe(true);
  });
  it("rejects malformed and unbounded hashes", () => {
    expect(verifyPassword("test", "pbkdf2$999999999$bad$bad")).toBe(false);
    expect(verifyPassword("test", "invalid")).toBe(false);
  });
});