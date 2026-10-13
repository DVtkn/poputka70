import { describe, expect, it } from "vitest";
import { matchesCronSecret } from "@/lib/cron-secret";

describe("секрет крона", () => {
  it("fail-closed без секрета", () => {
    expect(matchesCronSecret("Bearer abc", null)).toBe(false);
    expect(matchesCronSecret("Bearer abc", "")).toBe(false);
  });

  it("принимает только точный Bearer-заголовок", () => {
    expect(matchesCronSecret("Bearer s3cret", "s3cret")).toBe(true);
    expect(matchesCronSecret("Bearer wrong", "s3cret")).toBe(false);
    expect(matchesCronSecret(null, "s3cret")).toBe(false);
  });
});
