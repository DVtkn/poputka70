import { prisma } from "@/lib/prisma";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import { errors, fail, ok, serverError } from "@/lib/http";
import { rateLimitByIp } from "@/lib/rate-limit";
import { generateReferralCode } from "@/lib/referral";
import { verifyTelegramInitData, verifyTelegramWidgetData } from "@/lib/bot/telegram-auth";

/**
 * Аутентификация через Telegram:
 * 1. В Telegram Mini App: через initData с криптографической проверкой HMAC-SHA256.
 * 2. На сайте: через Telegram Login Widget с валидацией SHA256 хеша.
 */
export async function POST(request: Request) {
  const byIp = rateLimitByIp(request, "auth:telegram", 30, 15 * 60 * 1000);
  if (!byIp.allowed) return errors.rateLimited(byIp.retryAfterSec);

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return fail("INTERNAL", "Telegram bot token is not configured", 500);
  }

  let body: { initData?: string; widgetData?: Record<string, unknown> };
  try {
    body = (await request.json()) as { initData?: string; widgetData?: Record<string, unknown> };
  } catch {
    return errors.badRequest("Некорректный JSON");
  }

  const { initData, widgetData } = body;
  if (!initData && !widgetData) {
    return errors.badRequest("Не переданы данные авторизации Telegram");
  }

  const verification = initData
    ? verifyTelegramInitData(initData, token)
    : verifyTelegramWidgetData(widgetData!, token);

  if (!verification.valid || !verification.user) {
    return fail("AUTH_REQUIRED", verification.error || "Неверная подпись данных Telegram", 401);
  }

  const tgUser = verification.user;
  const telegramId = String(tgUser.id);

  try {
    let user = await prisma.user.findUnique({
      where: { telegramId },
      select: {
        id: true,
        login: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        telegramUsername: true,
      },
    });

    if (user) {
      if (user.status !== "ACTIVE") {
        return errors.forbidden("Аккаунт заблокирован. Обратись в поддержку.");
      }

      // Обновляем данные пользователя при необходимости
      const updates: Record<string, unknown> = { lastActiveAt: new Date() };
      if (tgUser.username && tgUser.username !== user.telegramUsername) {
        updates.telegramUsername = tgUser.username;
      }
      if (tgUser.first_name && tgUser.first_name !== user.firstName) {
        updates.firstName = tgUser.first_name;
      }
      if (tgUser.last_name !== undefined && tgUser.last_name !== user.lastName) {
        updates.lastName = tgUser.last_name;
      }

      if (Object.keys(updates).length > 1) {
        await prisma.user.update({
          where: { id: user.id },
          data: updates,
        });
      }
    } else {
      // Создаем нового пользователя
      let baseLogin = tgUser.username ? tgUser.username.toLowerCase() : `tg_${telegramId}`;
      baseLogin = baseLogin.replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 32);

      const existingWithLogin = await prisma.user.findUnique({
        where: { login: baseLogin },
        select: { id: true },
      });
      if (existingWithLogin) {
        baseLogin = `tg_${telegramId}`;
      }

      let referralCode = generateReferralCode();
      for (let attempt = 0; attempt < 5; attempt++) {
        const exists = await prisma.user.findUnique({ where: { referralCode }, select: { id: true } });
        if (!exists) break;
        referralCode = generateReferralCode();
      }

      user = await prisma.user.create({
        data: {
          telegramId,
          telegramUsername: tgUser.username ?? null,
          login: baseLogin,
          firstName: tgUser.first_name || "Пользователь",
          lastName: tgUser.last_name ?? null,
          role: "PASSENGER", // Роли не фиксируются при регистрации (AGENTS.md)
          authProvider: "TELEGRAM",
          status: "ACTIVE",
          referralCode,
        },
        select: {
          id: true,
          login: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
          telegramUsername: true,
        },
      });
    }

    const sessionToken = await createSessionToken(user.id);
    await setSessionCookie(sessionToken);

    return ok({
      user: {
        id: user.id,
        login: user.login,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (err) {
    return serverError("telegram:auth", err);
  }
}
