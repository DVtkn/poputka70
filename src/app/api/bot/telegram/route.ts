import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { handleTelegramUpdate } from "@/lib/bot/bot-engine";
import type { TelegramUpdate } from "@/lib/bot/types";

/**
 * Webhook-эндпоинт для Telegram Bot API.
 * Защищен проверкой секретного токена X-Telegram-Bot-Api-Secret-Token и рейт-лимитом.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const secretHeader = request.headers.get("x-telegram-bot-api-secret-token");
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (expectedSecret && secretHeader !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const chatId = update.message?.chat.id || update.callback_query?.message?.chat.id;

  if (chatId) {
    const rl = rateLimit(`tg_chat_${chatId}`, 30, 60_000);
    if (!rl.allowed) {
      console.warn(`[TelegramBot] Rate limited chat: ${chatId}`);
      return NextResponse.json({ ok: true, rateLimited: true });
    }
  }

  try {
    await handleTelegramUpdate(update);
  } catch (error) {
    console.error("[TelegramBot] Error handling update:", error);
  }

  // Telegram ожидает быстрый 200 OK
  return NextResponse.json({ ok: true });
}

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "active",
    service: "Poputka70 Telegram Bot Webhook",
  });
}
