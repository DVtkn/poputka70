"use client";

import { useEffect } from "react";
import Script from "next/script";

function performSilentTelegramAuth() {
  try {
    if (typeof window === "undefined" || !window.Telegram?.WebApp) return;
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.expand();

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
  useEffect(() => {
    performSilentTelegramAuth();
  }, []);

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onLoad={performSilentTelegramAuth}
    />
  );
}
