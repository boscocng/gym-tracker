import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

export function tokenMatches(received: string | null, expected: string): boolean {
  return received !== null && timingSafeEqual(digest(received), digest(expected));
}
