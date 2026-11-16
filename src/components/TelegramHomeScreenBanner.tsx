"use client";

import { useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import type { TelegramHomeScreenStatus } from "@/lib/bot/types";

const DISMISS_KEY = "tg_home_screen_banner_dismissed";

export default function TelegramHomeScreenBanner() {
  const [status, setStatus] = useState<TelegramHomeScreenStatus | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (typeof window === "undefined" || !window.Telegram?.WebApp) return;
      if (sessionStorage.getItem(DISMISS_KEY) === "1") return;

      const tg = window.Telegram.WebApp;
      if (typeof tg.checkHomeScreenStatus === "function") {
        tg.checkHomeScreenStatus((currentStatus) => {
          setStatus(currentStatus);
          if (currentStatus === "missed") {
            setDismissed(false);
          }
        });
      }
    } catch {
      // noop вне среды Telegram
    }
  }, []);

  if (dismissed || status !== "missed") {
    return null;
  }

  const handleAdd = () => {
    try {
      window.Telegram?.WebApp?.addToHomeScreen?.();
      setDismissed(true);
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // noop
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // noop
    }
  };

  return (
    <div
      role="region"
      aria-label="Добавление на главный экран"
      className="bg-river text-white px-4 py-3 shadow-md border-b border-river-dark flex items-center justify-between gap-3 text-sm animate-in fade-in duration-200"
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
          <Smartphone className="w-4 h-4 text-white" strokeWidth={2} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold leading-tight truncate">Добавь Попутку70 на экран</p>
          <p className="text-white/80 text-xs leading-tight truncate">
            Открывай поездки в один клик с рабочего стола
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleAdd}
          className="bg-white text-river hover:bg-snow font-medium text-xs px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-xs"
        >
          <Download className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
          Добавить
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="text-white/80 hover:text-white p-1 rounded-md transition-colors"
          aria-label="Закрыть подсказку"
        >
          <X className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
