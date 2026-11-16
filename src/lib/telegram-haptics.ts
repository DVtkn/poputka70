import type { TelegramHapticImpactStyle } from "@/lib/bot/types";

/**
 * Безопасная обёртка над Telegram WebApp HapticFeedback API (Bot API 8.0).
 * Методы безопасны для вызова в браузере и на старых клиентах — ошибки не выбрасываются.
 */
export const tgHaptics = {
  /**
   * Мягкий щелчок при изменении выбора (остановки, селекты, переключатели).
   */
  selection(): void {
    try {
      if (typeof window !== "undefined") {
        window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
      }
    } catch {
      // noop вне Telegram
    }
  },

  /**
   * Тактильный отклик при успешном завершении действия (бронирование, подтверждение поездки).
   */
  success(): void {
    try {
      if (typeof window !== "undefined") {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("success");
      }
    } catch {
      // noop вне Telegram
    }
  },

  /**
   * Тактильное предупреждение (отмена заявки или отмена поездки).
   */
  warning(): void {
    try {
      if (typeof window !== "undefined") {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("warning");
      }
    } catch {
      // noop вне Telegram
    }
  },

  /**
   * Тактильный отклик при ошибке выполнения операции.
   */
  error(): void {
    try {
      if (typeof window !== "undefined") {
        window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.("error");
      }
    } catch {
      // noop вне Telegram
    }
  },

  /**
   * Физический удар заданной силы (light, medium, heavy, rigid, soft).
   */
  impact(style: TelegramHapticImpactStyle = "medium"): void {
    try {
      if (typeof window !== "undefined") {
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred?.(style);
      }
    } catch {
      // noop вне Telegram
    }
  },
};
