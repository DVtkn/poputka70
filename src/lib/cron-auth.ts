import type { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { matchesCronSecret } from "@/lib/cron-secret";

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Cron-эндпоинты доступны только с секретом в Authorization.
 * Vercel Cron сам подставляет `Authorization: Bearer $CRON_SECRET`.
 * Секрет обязателен всегда (fail-closed): без него кроны не вызываются.
 */
export function isAuthorizedCron(request: Request): boolean {
  return matchesCronSecret(request.headers.get("authorization"), CRON_SECRET);
}

export function unauthorizedCron(): NextResponse {
  return fail("AUTH_REQUIRED", "Unauthorized", 401);
}
