import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { tgHaptics } from "@/lib/telegram-haptics";
import { parseTelegramStartParam, syncTelegramSafeArea } from "@/components/TelegramInit";
import {
  buildTripTmaUrl,
  buildTripShareText,
  buildTelegramShareUrl,
} from "@/components/TripShareButton";
import type { TelegramWebApp } from "@/lib/bot/types";

describe("Telegram UX & Native TMA (Bot API 8.0)", () => {
  let cssVars: Map<string, string>;
  const originalWindow = (globalThis as unknown as { window?: unknown }).window;
  const originalDocument = (globalThis as unknown as { document?: unknown }).document;

  beforeEach(() => {
    cssVars = new Map<string, string>();

    const mockDocument = {
      documentElement: {
        style: {
          setProperty: (key: string, val: string) => cssVars.set(key, val),
          getPropertyValue: (key: string) => cssVars.get(key) ?? "",
        },
      },
    };

    const mockWindow = {
      Telegram: undefined as { WebApp?: TelegramWebApp } | undefined,
      location: {
        href: "https://poputka70.vercel.app/trips/cuid123",
        search: "",
        hash: "",
      },
    };

    (globalThis as unknown as { window: unknown }).window = mockWindow;
    (globalThis as unknown as { document: unknown }).document = mockDocument;
  });

  afterEach(() => {
    (globalThis as unknown as { window: unknown }).window = originalWindow;
    (globalThis as unknown as { document: unknown }).document = originalDocument;
    vi.restoreAllMocks();
  });

  describe("tgHaptics helper", () => {
    it("safely handles calls when window.Telegram is undefined", () => {
      window.Telegram = undefined;

      expect(() => tgHaptics.selection()).not.toThrow();
      expect(() => tgHaptics.success()).not.toThrow();
      expect(() => tgHaptics.warning()).not.toThrow();
      expect(() => tgHaptics.error()).not.toThrow();
      expect(() => tgHaptics.impact("heavy")).not.toThrow();
    });

    it("safely handles calls when HapticFeedback is undefined on WebApp", () => {
      window.Telegram = {
        WebApp: {
          ready: vi.fn(),
          expand: vi.fn(),
          close: vi.fn(),
        },
      };

      expect(() => tgHaptics.selection()).not.toThrow();
      expect(() => tgHaptics.success()).not.toThrow();
      expect(() => tgHaptics.warning()).not.toThrow();
      expect(() => tgHaptics.error()).not.toThrow();
      expect(() => tgHaptics.impact()).not.toThrow();
    });

    it("triggers selectionChanged on selection()", () => {
      const selectionChanged = vi.fn();
      window.Telegram = {
        WebApp: {
          ready: vi.fn(),
          expand: vi.fn(),
          close: vi.fn(),
          HapticFeedback: {
            selectionChanged,
            notificationOccurred: vi.fn(),
            impactOccurred: vi.fn(),
          },
        },
      };

      tgHaptics.selection();
      expect(selectionChanged).toHaveBeenCalledTimes(1);
    });

    it("triggers notificationOccurred with correct type", () => {
      const notificationOccurred = vi.fn();
      window.Telegram = {
        WebApp: {
          ready: vi.fn(),
          expand: vi.fn(),
          close: vi.fn(),
          HapticFeedback: {
            selectionChanged: vi.fn(),
            notificationOccurred,
            impactOccurred: vi.fn(),
          },
        },
      };

      tgHaptics.success();
      expect(notificationOccurred).toHaveBeenCalledWith("success");

      tgHaptics.warning();
      expect(notificationOccurred).toHaveBeenCalledWith("warning");

      tgHaptics.error();
      expect(notificationOccurred).toHaveBeenCalledWith("error");
    });

    it("triggers impactOccurred with requested style", () => {
      const impactOccurred = vi.fn();
      window.Telegram = {
        WebApp: {
          ready: vi.fn(),
          expand: vi.fn(),
          close: vi.fn(),
          HapticFeedback: {
            selectionChanged: vi.fn(),
            notificationOccurred: vi.fn(),
            impactOccurred,
          },
        },
      };

      tgHaptics.impact("heavy");
      expect(impactOccurred).toHaveBeenCalledWith("heavy");

      tgHaptics.impact(); // default medium
      expect(impactOccurred).toHaveBeenCalledWith("medium");
    });
  });

  describe("parseTelegramStartParam", () => {
    it("extracts tripId from trip_<id> format", () => {
      expect(parseTelegramStartParam("trip_cuid12345")).toEqual({
        type: "trip",
        tripId: "cuid12345",
      });
      expect(parseTelegramStartParam("  trip_abc_xyz  ")).toEqual({
        type: "trip",
        tripId: "abc_xyz",
      });
    });

    it("returns null for empty or invalid inputs", () => {
      expect(parseTelegramStartParam(null)).toBeNull();
      expect(parseTelegramStartParam(undefined)).toBeNull();
      expect(parseTelegramStartParam("")).toBeNull();
      expect(parseTelegramStartParam("   ")).toBeNull();
      expect(parseTelegramStartParam("trip_")).toBeNull();
      expect(parseTelegramStartParam("other_param_123")).toBeNull();
    });
  });

  describe("Deep link and share URL construction", () => {
    it("builds TMA url with startapp parameter", () => {
      const url = buildTripTmaUrl("trip999", "poputka70_tomsk_bot");
      expect(url).toBe("https://t.me/poputka70_tomsk_bot/app?startapp=trip_trip999");

      const baseTma = buildTripTmaUrl(undefined, "poputka70_tomsk_bot");
      expect(baseTma).toBe("https://t.me/poputka70_tomsk_bot/app");
    });

    it("builds formatted trip share text with required details", () => {
      const text = buildTripShareText({
        origin: "Томск (Южная)",
        dest: "Северск",
        dateStr: "17 ноября",
        timeStr: "08:30",
        availableSeats: 3,
        price: 150,
        url: "https://t.me/poputka70_tomsk_bot/app?startapp=trip_abc",
      });

      expect(text).toContain("Томск (Южная) → Северск");
      expect(text).toContain("17 ноября в 08:30");
      expect(text).toContain("Мест: 3 · от 150 ₽");
      expect(text).toContain("https://t.me/poputka70_tomsk_bot/app?startapp=trip_abc");
    });

    it("builds Telegram share dialog url with encoded parameters", () => {
      const targetUrl = "https://t.me/poputka70_tomsk_bot/app?startapp=trip_abc";
      const shareText = "Попутка Томск → Северск";
      const result = buildTelegramShareUrl(targetUrl, shareText);

      expect(result).toBe(
        `https://t.me/share/url?url=${encodeURIComponent(targetUrl)}&text=${encodeURIComponent(shareText)}`
      );
    });
  });

  describe("Safe area synchronization", () => {
    it("sets root CSS variables from contentSafeAreaInset / safeAreaInset", () => {
      const mockWebApp: Partial<TelegramWebApp> = {
        ready: vi.fn(),
        expand: vi.fn(),
        close: vi.fn(),
        contentSafeAreaInset: {
          top: 44,
          bottom: 34,
          left: 0,
          right: 0,
        },
      };

      window.Telegram = { WebApp: mockWebApp as TelegramWebApp };

      syncTelegramSafeArea();

      expect(document.documentElement.style.getPropertyValue("--tg-safe-area-top")).toBe("44px");
      expect(document.documentElement.style.getPropertyValue("--tg-safe-area-bottom")).toBe("34px");
    });

    it("falls back to safeAreaInset or 0px if contentSafeAreaInset is missing", () => {
      const mockWebApp: Partial<TelegramWebApp> = {
        ready: vi.fn(),
        expand: vi.fn(),
        close: vi.fn(),
        safeAreaInset: {
          top: 20,
          bottom: 10,
          left: 0,
          right: 0,
        },
      };

      window.Telegram = { WebApp: mockWebApp as TelegramWebApp };

      syncTelegramSafeArea();

      expect(document.documentElement.style.getPropertyValue("--tg-safe-area-top")).toBe("20px");
      expect(document.documentElement.style.getPropertyValue("--tg-safe-area-bottom")).toBe("10px");
    });
  });
});
