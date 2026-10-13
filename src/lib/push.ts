import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

const DEFAULT_VAPID_SUBJECT = "mailto:admin@poputka70.ru";

/** Платформа требует mailto: или https:-адрес; любое другое значение игнорируем. */
function resolveVapidSubject(): string {
  const raw = (process.env.VAPID_SUBJECT || "").trim();
  if (raw.startsWith("mailto:") || raw.startsWith("https://")) return raw;
  return DEFAULT_VAPID_SUBJECT;
}

let pushReady = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    webpush.setVapidDetails(resolveVapidSubject(), vapidPublicKey, vapidPrivateKey);
    pushReady = true;
  } catch (error) {
    // Кривые ключи/субъект не должны валить приложение: push просто выключается
    console.error("[push] VAPID-настройки не приняты, push отключён:", error);
    pushReady = false;
  }
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

export function isPushConfigured(): boolean {
  return pushReady;
}

type PushSendResult = "sent" | "expired" | "failed";

function statusCodeOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const value = (error as { statusCode?: unknown }).statusCode;
    return typeof value === "number" ? value : undefined;
  }
  return undefined;
}

export async function sendPushNotification(
  subscription: PushSubscriptionData,
  payload: object
): Promise<PushSendResult> {
  if (!isPushConfigured()) return "failed";

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload)
    );
    return "sent";
  } catch (error) {
    const status = statusCodeOf(error);
    if (status === 404 || status === 410) return "expired";
    console.error("Push error:", error);
    return "failed";
  }
}

const PUSH_CONCURRENCY = 5;

/** Отправляет пуш на все подписки пользователя; просроченные подписки удаляет. */
export async function sendNotificationToUser(userId: string, payload: object): Promise<number> {
  if (!isPushConfigured()) return 0;

  const { prisma } = await import("@/lib/prisma");
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subscriptions.length === 0) return 0;

  const expiredEndpoints: string[] = [];
  let sent = 0;

  for (let i = 0; i < subscriptions.length; i += PUSH_CONCURRENCY) {
    const batch = subscriptions.slice(i, i + PUSH_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (sub) => ({
        endpoint: sub.endpoint,
        result: await sendPushNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        ),
      }))
    );
    for (const item of results) {
      if (item.result === "sent") sent += 1;
      if (item.result === "expired") expiredEndpoints.push(item.endpoint);
    }
  }

  if (expiredEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { userId, endpoint: { in: expiredEndpoints } },
    });
  }

  return sent;
}

/** Пакетная отправка одному и тому же уведомлению нескольким пользователям. */
export async function sendNotificationToUsers(userIds: string[], payload: object): Promise<number> {
  const unique = [...new Set(userIds)];
  let sent = 0;
  for (let i = 0; i < unique.length; i += PUSH_CONCURRENCY) {
    const results = await Promise.all(
      unique.slice(i, i + PUSH_CONCURRENCY).map((id) =>
        sendNotificationToUser(id, payload).catch(() => 0)
      )
    );
    sent += results.reduce((sum, value) => sum + value, 0);
  }
  return sent;
}

export function createNotificationPayload(title: string, body: string, data?: object) {
  return {
    title,
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    data: { url: "/notifications", ...data },
    actions: [
      { action: "view", title: "Открыть" },
      { action: "dismiss", title: "Закрыть" },
    ],
    requireInteraction: true,
  };
}
