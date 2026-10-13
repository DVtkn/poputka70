import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";
import { errors, fail, ok, parseBody, serverError } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";
import { rateLimit, rateLimitByIp } from "@/lib/rate-limit";

// Фиктивный bcrypt-хеш: сравнение выполняется всегда — иначе по времени ответа
// можно понять, существует ли логин.
const DUMMY_PASSWORD_HASH = "$2b$10$SJ4K.kXPAvkHwUzwcalJ4O5Sob0hxXjfPZR87l811rtubw6qqMCqa";

const DUMMY_HASH_FALLBACK = DUMMY_PASSWORD_HASH;

export async function POST(request: Request) {
  const parsed = await parseBody(request, loginSchema);
  if (!parsed.ok) return parsed.response;

  const { login, password } = parsed.data;

  const byIp = rateLimitByIp(request, "auth:login", 20, 15 * 60 * 1000);
  if (!byIp.allowed) return errors.rateLimited(byIp.retryAfterSec);

  const byLogin = rateLimit(`auth:login:${login.toLowerCase()}`, 10, 15 * 60 * 1000);
  if (!byLogin.allowed) return errors.rateLimited(byLogin.retryAfterSec);

  try {
    const user = await prisma.user.findUnique({
      where: { login },
      select: {
        id: true,
        login: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        driverProfile: { select: { id: true } },
      },
    });

    const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH_FALLBACK);

    if (!user || !passwordOk) {
      return fail("AUTH_REQUIRED", "Неверный логин или пароль", 401);
    }

    if (user.status !== "ACTIVE") {
      return errors.forbidden("Аккаунт заблокирован. Обратись в поддержку.");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastActiveAt: new Date() },
    });

    const token = await createSessionToken(user.id);
    await setSessionCookie(token);

    return ok({
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      isNewUser: user.role === "PASSENGER" && !user.driverProfile,
    });
  } catch (error) {
    return serverError("auth.login", error);
  }
}
