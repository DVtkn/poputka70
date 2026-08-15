import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || "";
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || "";

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails("mailto:admin@poputka70.ru", vapidPublicKey, vapidPrivateKey);
}

export interface PushSubscriptionData {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function getVapidPublicKey(): string {
  return vapidPublicKey;
}

export async function sendPushNotification(subscription: PushSubscriptionData, payload: object): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn("VAPID keys not configured");
    return false;
  }

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload)
    );
    return true;
  } catch (error: any) {
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.log("Subscription expired, should be removed");
    } else {
      console.error("Push error:", error);
    }
    return false;
  }
}

export async function sendNotificationToUser(userId: string, payload: object): Promise<number> {
  const { prisma } = await import("@/lib/prisma");
  const subscriptions = await prisma.pushSubscription.findMany({ where: { userId } });

  let sent = 0;
  for (const sub of subscriptions) {
    const success = await sendPushNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      payload
    );
    if (success) sent++;
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