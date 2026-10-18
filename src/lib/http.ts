import { NextResponse } from "next/server";
import { z } from "zod";

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "VALIDATION_ERROR"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "PAYMENT_REQUIRED"
  | "INTERNAL";

export interface ApiErrorPayload {
  code: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function ok(
  data: Record<string, unknown> = {},
  status = 200,
  headers?: Record<string, string>
): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status, headers });
}

export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  fieldErrors?: Record<string, string>,
  headers: Record<string, string> = {}
): NextResponse {
  const error: ApiErrorPayload = { code, message, ...(fieldErrors ? { fieldErrors } : {}) };
  return NextResponse.json({ success: false, error }, { status, headers });
}

export const errors = {
  authRequired: () => fail("AUTH_REQUIRED", "Сначала войди в систему", 401),
  forbidden: (message = "Недостаточно прав") => fail("FORBIDDEN", message, 403),
  notFound: (message = "Не найдено") => fail("NOT_FOUND", message, 404),
  conflict: (message: string) => fail("CONFLICT", message, 409),
  badRequest: (message: string) => fail("BAD_REQUEST", message, 400),
  rateLimited: (retryAfterSec: number) =>
    fail(
      "RATE_LIMITED",
      `Слишком много запросов. Попробуй снова через ${retryAfterSec} с.`,
      429,
      undefined,
      { "Retry-After": String(retryAfterSec) }
    ),
  internal: () => fail("INTERNAL", "Внутренняя ошибка сервиса", 500),
};

/** Логирует подробности у себя, наружу отдаёт общий текст. */
export function serverError(scope: string, error: unknown): NextResponse {
  console.error(`[${scope}]`, error);
  return errors.internal();
}

function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const result: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_";
    if (!result[key]) result[key] = issue.message;
  }
  return result;
}

type ParseResult<S extends z.ZodTypeAny> =
  | { ok: true; data: z.infer<S> }
  | { ok: false; response: NextResponse };

function validate<S extends z.ZodTypeAny>(input: unknown, schema: S): ParseResult<S> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      response: fail("VALIDATION_ERROR", "Проверь заполнение полей", 400, zodFieldErrors(parsed.error)),
    };
  }
  return { ok: true, data: parsed.data as z.infer<S> };
}

export async function parseBody<S extends z.ZodTypeAny>(
  request: Request,
  schema: S
): Promise<ParseResult<S>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { ok: false, response: fail("BAD_REQUEST", "Некорректный формат запроса", 400) };
  }
  return validate(raw, schema);
}

export function parseQuery<S extends z.ZodTypeAny>(request: Request, schema: S): ParseResult<S> {
  const url = new URL(request.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    raw[key] = value;
  });
  return validate(raw, schema);
}
