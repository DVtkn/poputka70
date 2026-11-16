import type {
  SendMessageOptions,
  SendWidgetOptions,
  SendWidgetResult,
  TelegramChatId,
} from "./types";

const TELEGRAM_API_BASE = "https://api.telegram.org";

function getToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("[TelegramBot] TELEGRAM_BOT_TOKEN is not configured in environment variables");
    return null;
  }
  return token;
}

export async function sendTelegramMessage(
  chatId: TelegramChatId,
  text: string,
  options?: SendMessageOptions
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      text,
      reply_markup: options?.reply_markup,
      disable_web_page_preview: options?.disable_web_page_preview ?? true,
    };

    if (options?.entities && options.entities.length > 0) {
      payload.entities = options.entities;
    } else {
      payload.parse_mode = options?.parse_mode ?? "HTML";
    }

    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
  chatId: TelegramChatId,
  messageId: number,
  text: string,
  options?: SendMessageOptions
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

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
  text?: string,
  showAlert?: boolean
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text,
        show_alert: showAlert ?? false,
      }),
    });
    return res.ok;
  } catch (error) {
    console.error("[TelegramBot] network error in answerCallbackQuery:", error);
    return false;
  }
}

export async function sendWidget(
  chatId: TelegramChatId,
  widgetHtml: string,
  options?: SendWidgetOptions
): Promise<SendWidgetResult> {
  const token = getToken();
  if (!token) {
    return { ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  try {
    const payload: Record<string, unknown> = {
      chat_id: chatId,
      widget: widgetHtml,
      caption: options?.caption,
      reply_markup: options?.reply_markup,
    };
    if (options?.data !== undefined) {
      payload.data = typeof options.data === "object" ? JSON.stringify(options.data) : options.data;
    }

    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendWidget`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as { ok: boolean; result?: { message_id: number } };
      return {
        ok: true,
        message_id: data.result?.message_id,
        fallbackUsed: false,
      };
    }

    const errText = await res.text();
    console.warn("[TelegramBot] sendWidget returned non-OK, using classic fallback:", res.status, errText);
  } catch (error) {
    console.warn("[TelegramBot] sendWidget error, using classic fallback:", error);
  }

  // Фоллбэк: если клиент пользователя не поддерживает widgets или API вернул ошибку
  const fallbackText = options?.fallbackText || options?.caption || "🚗 <b>Интерактивный виджет рейса</b>";
  const fallbackOk = await sendTelegramMessage(chatId, fallbackText, {
    reply_markup: options?.reply_markup,
  });

  return {
    ok: fallbackOk,
    fallbackUsed: true,
  };
}

export async function editMessageWidgetData(
  chatId: TelegramChatId,
  messageId: number,
  data: string | Record<string, unknown>
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/editMessageWidgetData`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        data: typeof data === "object" ? JSON.stringify(data) : data,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[TelegramBot] editMessageWidgetData failed:", res.status, errText);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[TelegramBot] network error in editMessageWidgetData:", error);
    return false;
  }
}

export async function answerWidgetQuery(
  widgetQueryId: string,
  text?: string,
  showAlert?: boolean,
  url?: string
): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/answerWidgetQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        widget_query_id: widgetQueryId,
        text,
        show_alert: showAlert ?? false,
        url,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("[TelegramBot] answerWidgetQuery failed:", res.status, errText);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[TelegramBot] network error in answerWidgetQuery:", error);
    return false;
  }
}

export async function setTelegramMenuButton(webAppUrl: string): Promise<boolean> {
  const token = getToken();
  if (!token) return false;

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
  if (!token) {
    return { ok: false, description: "TELEGRAM_BOT_TOKEN is not configured" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: webhookUrl,
        secret_token: secretToken,
        allowed_updates: ["message", "callback_query", "widget_query"],
      }),
    });
    return await res.json();
  } catch (error) {
    console.error("[TelegramBot] network error in setWebhook:", error);
    return { ok: false, description: String(error) };
  }
}
