"use client";

import { useEffect } from "react";
import Script from "next/script";

export function TelegramInit() {
  useEffect(() => {
    try {
      if (typeof window !== "undefined" && window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
      }
    } catch {
      // Ignored outside Telegram webview environment
    }
  }, []);

  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
    />
  );
}
