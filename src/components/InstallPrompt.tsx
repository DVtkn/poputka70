"use client";

import { useEffect, useState } from "react";
import { Bell, CheckCircle2, Download, Share, Smartphone } from "lucide-react";
import { usePush } from "@/components/PushProvider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Установка на экран «Домой» и уведомления.
 * iPhone: push доступен только после установки (iOS 16.4+), поэтому сначала инструкция.
 */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const { isSupported, permission, subscribe, unsubscribe } = usePush();

  useEffect(() => {
    let active = true;

    const init = async () => {
      await Promise.resolve();
      if (!active) return;
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setInstalled(standalone);
      setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    };

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    void init();
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => {
      active = false;
      window.removeEventListener("beforeinstallprompt", onPrompt);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    setDeferred(null);
  };

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-river-light text-river flex items-center justify-center flex-shrink-0">
          <Smartphone className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Приложение на телефоне</div>
          {installed ? (
            <p className="text-sm text-frost-dark flex items-center gap-1.5 mt-0.5">
              <CheckCircle2 className="w-4 h-4 text-river" strokeWidth={2} aria-hidden="true" />
              Установлено — открывается как обычное приложение
            </p>
          ) : isIOS ? (
            <p className="text-sm text-frost-dark mt-0.5 leading-relaxed">
              В Safari нажми <Share className="inline w-4 h-4 -mt-0.5" strokeWidth={1.75} aria-hidden="true" /> «Поделиться»
              и выбери «На экран Домой».
            </p>
          ) : deferred ? (
            <button type="button" onClick={() => void install()} className="btn-secondary mt-2 px-4 py-2 text-sm">
              <Download className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
              Установить приложение
            </button>
          ) : (
            <p className="text-sm text-frost-dark mt-0.5 leading-relaxed">
              Открой меню браузера и выбери «Установить приложение» или «Добавить на главный экран».
            </p>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 pt-4 border-t border-fog">
        <div className="w-10 h-10 rounded-lg bg-river-light text-river flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold">Уведомления</div>
          {permission === "granted" ? (
            <div className="flex items-center justify-between gap-3 mt-1">
              <p className="text-sm text-frost-dark">Включены: заявки, подтверждения и напоминания</p>
              <button
                type="button"
                onClick={() => void unsubscribe()}
                className="text-xs text-frost-dark hover:text-ember underline flex-shrink-0"
              >
                Отключить
              </button>
            </div>
          ) : isIOS && !installed ? (
            <p className="text-sm text-frost-dark mt-0.5 leading-relaxed">
              На iPhone уведомления включаются после установки приложения на экран «Домой».
            </p>
          ) : isSupported ? (
            <button
              type="button"
              onClick={() => void subscribe()}
              className="btn-primary mt-2 px-4 py-2 text-sm"
              disabled={!isSupported}
            >
              Включить уведомления
            </button>
          ) : (
            <p className="text-sm text-frost-dark mt-0.5">Браузер не поддерживает уведомления</p>
          )}
        </div>
      </div>
    </div>
  );
}
