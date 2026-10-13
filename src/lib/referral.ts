import { randomBytes } from "node:crypto";

// 32 символа — 256 % 32 === 0, поэтому отображение байтов равномерное.
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CHARS.charAt(bytes[i] % CHARS.length);
  }
  return code;
}
