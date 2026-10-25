import type { SendMessageOptions } from "./types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured in environment variables");
  }
  return token;
}

export async function sendTelegramMessage(
  chatId: number,
  text: string,
  options?: SendMessageOptions
): Promise<boolean> {
  const token = getToken();
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parse_mode ?? "HTML",
        reply_markup: options?.reply_markup,
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[TelegramBot] sendMessage failed:", res.status, errText);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[TelegramBot] network error in sendMessage:", error);
    return false;
  }
}

export async function editTelegramMessage(
  chatId: number,
  messageId: number,
  text: string,
  options?: SendMessageOptions
): Promise<boolean> {
  const token = getToken();
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options?.parse_mode ?? "HTML",
        reply_markup: options?.reply_markup,
        disable_web_page_preview: options?.disable_web_page_preview ?? true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[TelegramBot] editMessageText failed:", res.status, errText);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[TelegramBot] network error in editMessageText:", error);
    return false;
  }
}

export async function answerTelegramCallback(
  callbackQueryId: string,
  text?: string
): Promise<boolean> {
  const token = getToken();
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("[TelegramBot] network error in answerCallbackQuery:", error);
    return false;
  }
}

export async function setTelegramMenuButton(webAppUrl: string): Promise<boolean> {
  const token = getToken();
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "Попутка70",
          web_app: { url: webAppUrl },
        },
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("[TelegramBot] network error in setChatMenuButton:", error);
    return false;
  }
}

export async function setTelegramWebhook(
  webhookUrl: string,
  secretToken: string
): Promise<{ ok: boolean; description?: string }> {
  const token = getToken();
  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ["message", "callback_query"],
      }),
    });
    return await res.json();
  } catch (error) {
    console.error("[TelegramBot] network error in setWebhook:", error);
    return { ok: false, description: String(error) };
  }
}
