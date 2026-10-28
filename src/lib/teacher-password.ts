import { pbkdf2 } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

// Pure JavaScript PBKDF2 preserves existing 120,000-round hashes without
// depending on the Worker's native 100,000-round ceiling.
const ITERATIONS = 120_000;
const KEYLEN = 32;

export function hashPassword(plain: string): string {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const hash = pbkdf2(sha256, plain, salt, { c: ITERATIONS, dkLen: KEYLEN });
  return `pbkdf2$${ITERATIONS}$${salt}$${bytesToHex(hash)}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const parts = stored.split("$");
    const [scheme, iterStr, salt, hash] = parts;
    if (parts.length !== 4 || scheme !== "pbkdf2" || !iterStr || !salt || !hash) return false;
    if (!/^\d+$/.test(iterStr) || !/^[a-f0-9]{32}$/i.test(salt) || !/^[a-f0-9]{64}$/i.test(hash)) return false;
    const iterations = Number(iterStr);
    if (!Number.isSafeInteger(iterations) || iterations < 1 || iterations > 1_000_000) return false;
    const computed = pbkdf2(sha256, plain, salt, { c: iterations, dkLen: KEYLEN });
    const expected = hexToBytes(hash);
    let difference = 0;
    for (let i = 0; i < computed.length; i++) difference |= computed[i] ^ expected[i];
    return difference === 0;
  } catch {
    return false;
  }
}