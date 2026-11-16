import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getJwtSecret } from "@/lib/auth";

describe("getJwtSecret", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("throws error in production if JWT_SECRET is not set", () => {
    delete process.env.JWT_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    expect(() => getJwtSecret()).toThrow("JWT_SECRET environment variable is required in production");
  });

  it("returns configured secret in production", () => {
    process.env.JWT_SECRET = "production-super-secret-key-123456";
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const secretBytes = getJwtSecret();
    expect(secretBytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(secretBytes)).toBe("production-super-secret-key-123456");
  });

  it("falls back to dev secret in non-production when JWT_SECRET is unset", () => {
    delete process.env.JWT_SECRET;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";

    const secretBytes = getJwtSecret();
    expect(secretBytes).toBeInstanceOf(Uint8Array);
    expect(new TextDecoder().decode(secretBytes)).toBe("ai-studio-dev-jwt-secret-change-in-production");
  });
});
