"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { getVapidPublicKey } from "@/lib/push-client";

interface PushContextType {
  isSupported: boolean;
  permission: NotificationPermission;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushContext = createContext<PushContextType | null>(null);

// Мини-стор для внешних состояний (поддержка браузера и разрешение на уведомления)
const listeners = new Set<() => void>();
function emitChange() {
  for (const listener of listeners) listener();
}
function subscribeToStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function isSupportedNow(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}
function permissionNow(): NotificationPermission {
  return typeof window !== "undefined" && "Notification" in window
    ? Notification.permission
    : "default";
}
function serverSnapshotFalse(): boolean {
  return false;
}
function serverSnapshotDefault(): NotificationPermission {
  return "default";
}

function keyToBase64(key: ArrayBuffer | null): string {
  if (!key) return "";
  return btoa(String.fromCharCode(...new Uint8Array(key)));
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) bytes[i] = rawData.charCodeAt(i);
  return bytes.buffer as ArrayBuffer;
}

export function PushProvider({ children }: { children: ReactNode }) {
  const isSupported = useSyncExternalStore(subscribeToStore, isSupportedNow, serverSnapshotFalse);
  const permission = useSyncExternalStore(subscribeToStore, permissionNow, serverSnapshotDefault);

  const subscribe = useCallback(async () => {
    if (!isSupportedNow()) return;

    if (permissionNow() !== "granted") {
      const result = await Notification.requestPermission();
      emitChange();
      if (result !== "granted") return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      if (existing) return;

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
            p256dh: keyToBase64(subscription.getKey("p256dh")),
            auth: keyToBase64(subscription.getKey("auth")),
          },
        }),
      });
    } catch (error) {
      console.error("Не удалось оформить push-подписку:", error);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!isSupportedNow()) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        await fetch(`/api/push-subscriptions?endpoint=${encodeURIComponent(subscription.endpoint)}`, {
          method: "DELETE",
        });
      }
    } catch (error) {
      console.error("Не удалось отключить push-подписку:", error);
    }
  }, []);

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
