import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimitByIp } from "@/lib/rate-limit";

/**
 * Middleware для защиты эндпоинтов аутентификации от брутфорса.
 * Дополняет точечное rate-limiting в каждом route handler — работает на уровне edge,
 * до того как запрос дойдёт до функции.
 *
 * Ограничение: 20 запросов в минуту с одного IP на все /api/auth/* маршруты.
 * При превышении — 429 с заголовком Retry-After.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/auth/")) {
    const limited = rateLimitByIp(request, "auth:waf", 20, 60 * 1000);
    if (!limited.allowed) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: {
            code: "RATE_LIMITED",
            message: `Слишком много запросов. Попробуй снова через ${limited.retryAfterSec} с.`,
          },
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(limited.retryAfterSec),
          },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/auth/:path*"],
};
