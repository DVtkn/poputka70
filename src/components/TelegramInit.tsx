"use client";

import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Script from "next/script";

/**
 * Синхронизирует безопасные зоны Telegram Mini App (Bot API 8.0) с CSS-переменными в :root.
 */
export function syncTelegramSafeArea(): void {
  try {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;
    const top = tg.contentSafeAreaInset?.top ?? tg.safeAreaInset?.top ?? 0;
    const bottom = tg.contentSafeAreaInset?.bottom ?? tg.safeAreaInset?.bottom ?? 0;
    const root = document.documentElement;
    root.style.setProperty("--tg-safe-area-top", `${top}px`);
    root.style.setProperty("--tg-safe-area-bottom", `${bottom}px`);
  } catch {
    // Игнорируем ошибки вне контекста браузера или в устаревших WebView
  }
}

/**
 * Парсит параметр запуска Mini App (startapp / start_param) формата `trip_<id>`.
 */
export function parseTelegramStartParam(
  startParam: string | null | undefined
): { type: "trip"; tripId: string } | null {
  if (!startParam) return null;
  const trimmed = startParam.trim();
  if (trimmed.startsWith("trip_")) {
    const tripId = trimmed.slice(5).trim();
    if (tripId.length > 0) {
      return { type: "trip", tripId };
    }
  }
  return null;
}

function performSilentTelegramAuth(): void {
  try {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;

    if (!tg.initData) return;

    // Проверяем, авторизован ли пользователь
    fetch("/api/auth/me")
      .then((res) => {
        if (res.status === 401) {
          // Пользователь не авторизован — автоматически входим по криптографическому initData
          return fetch("/api/auth/telegram", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          }).then((authRes) => {
            if (authRes.ok) {
              window.dispatchEvent(new Event("auth-changed"));
            }
          });
        }
      })
      .catch(() => {});
  } catch {
    // Игнорируем вне среды Telegram
  }
}

export function TelegramInit() {
  const pathname = usePathname();
  const router = useRouter();
  const handledDeepLink = useRef(false);

  const initTelegramFeatures = useCallback(() => {
    try {
      if (typeof window === "undefined" || !window.Telegram?.WebApp) return;
      const tg = window.Telegram.WebApp;

      tg.ready();

      // Полноэкранный режим Bot API 8.0 с мягкой деградацией на expand()
      if (typeof tg.requestFullscreen === "function") {
        tg.requestFullscreen();
      } else {
        tg.expand();
      }

      // Синхронизация safe area insets
      syncTelegramSafeArea();

      // Парсинг deep link startapp=trip_<id>
      if (!handledDeepLink.current) {
        const rawStartParam =
          tg.initDataUnsafe?.start_param ||
          new URLSearchParams(window.location.search).get("tgWebAppStartParam") ||
          (window.location.hash.includes("tgWebAppStartParam=")
            ? new URLSearchParams(window.location.hash.slice(1)).get("tgWebAppStartParam")
            : null);

        const parsed = parseTelegramStartParam(rawStartParam);
        if (parsed && parsed.type === "trip") {
          handledDeepLink.current = true;
          router.push(`/trips/${parsed.tripId}`);
        }
      }

      performSilentTelegramAuth();
    } catch {
      // Игнорируем вне среды Telegram
    }
  }, [router]);

  useEffect(() => {
    initTelegramFeatures();

    const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
    if (!tg) return;

    const handleSafeAreaChange = () => {
      syncTelegramSafeArea();
    };

    tg.onEvent?.("safeAreaChanged", handleSafeAreaChange);
    tg.onEvent?.("contentSafeAreaChanged", handleSafeAreaChange);
    tg.onEvent?.("fullscreenChanged", handleSafeAreaChange);

    return () => {
      tg.offEvent?.("safeAreaChanged", handleSafeAreaChange);
      tg.offEvent?.("contentSafeAreaChanged", handleSafeAreaChange);
      tg.offEvent?.("fullscreenChanged", handleSafeAreaChange);
    };
  }, [initTelegramFeatures]);

  // Управление нативной кнопкой BackButton (Bot API 8.0)
  useEffect(() => {
    if (typeof window === "undefined" || !window.Telegram?.WebApp?.BackButton) return;
    const backBtn = window.Telegram.WebApp.BackButton;

    const handleBackClick = () => {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    };

    if (pathname === "/") {
      try {
        backBtn.hide();
      } catch {
        // noop
      }
    } else {
      try {
        backBtn.show();
        backBtn.onClick(handleBackClick);
      } catch {
        // noop
      }
    }

    return () => {
      try {
        backBtn.offClick(handleBackClick);
      } catch {
        // noop
      }
    };
  }, [pathname, router]);

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onLoad={initTelegramFeatures}
    />
  );
}
