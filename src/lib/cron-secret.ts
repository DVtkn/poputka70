import { timingSafeEqual } from "node:crypto";

function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Проверяет заголовок Authorization против секрета крона (fail-closed). */
export function matchesCronSecret(header: string | null | undefined, secret: string | null | undefined): boolean {
  if (!secret) return false;
  if (!header) return false;
  return safeEqual(header, `Bearer ${secret}`);
}
