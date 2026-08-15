"use client";

import { useEffect, useState } from "react";
import { createContext, useContext, ReactNode } from "react";
import { getVapidPublicKey } from "@/lib/push-client";

interface PushContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextType | null>(null);

export function PushProvider({ children }: { children: ReactNode }) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setIsSupported(supported);
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  const subscribe = async () => {
    if (!isSupported) return;
    if (permission !== "granted") {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existingSub = await registration.pushManager.getSubscription();
      if (existingSub) return;

      const publicKey = getVapidPublicKey();
      if (!publicKey) return;

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch("/api/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subscription.endpoint,
          keys: {
            p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("p256dh")!))),
            auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey("auth")!))),
          },
        }),
      });
    } catch (e) {
      console.error("Push subscribe error:", e);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch(`/api/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        });
      }
    } catch (e) {
      console.error("Push unsubscribe error:", e);
    }
  };

  return (
    <PushContext.Provider value={{ isSupported, permission, subscribe, unsubscribe }}>
      {children}
    </PushContext.Provider>
  );
}

export function usePush() {
  const context = useContext(PushContext);
  if (!context) throw new Error("usePush must be used within PushProvider");
  return context;
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
}