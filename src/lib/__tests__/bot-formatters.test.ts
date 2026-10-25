import { describe, it, expect, vi } from "vitest";
import { escapeHtml, formatTripDateTomsk, formatTripCardHtml } from "../bot/formatters";
import type { TripSearchItem } from "@/lib/trips";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/trips", () => ({ searchTrips: vi.fn(), tripRoute: vi.fn() }));

describe("Bot Formatters", () => {
  describe("escapeHtml", () => {
    it("escapes dangerous HTML characters", () => {
      expect(escapeHtml("<script>alert('xss')</script>")).toBe(
        "&lt;script&gt;alert('xss')&lt;/script&gt;"
      );
      expect(escapeHtml("Tom & Jerry")).toBe("Tom &amp; Jerry");
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
    });
  });

  describe("formatTripDateTomsk", () => {
    it("formats today or future date in Tomsk timezone", () => {
      // 12:00 UTC = 19:00 Tomsk time (UTC+7)
      const now = new Date("2026-10-25T05:00:00.000Z"); // 12:00 Tomsk
      const todayTrip = new Date("2026-10-25T12:00:00.000Z"); // 19:00 Tomsk
      const tomorrowTrip = new Date("2026-10-26T03:00:00.000Z"); // 10:00 Tomsk
      const futureTrip = new Date("2026-10-28T08:30:00.000Z"); // 15:30 Tomsk

      expect(formatTripDateTomsk(todayTrip, now)).toBe("Сегодня в 19:00");
      expect(formatTripDateTomsk(tomorrowTrip, now)).toBe("Завтра в 10:00");
      expect(formatTripDateTomsk(futureTrip, now)).toBe("28.10 в 15:30");
    });
  });

  describe("formatTripCardHtml", () => {
    it("formats trip card with car and driver info", () => {
      const mockTrip: TripSearchItem = {
        id: "trip123",
        date: new Date("2026-10-25T12:00:00.000Z"),
        departureTime: new Date("2026-10-25T12:00:00.000Z"),
        originName: "Томск",
        destName: "Асино",
        priceFull: 400,
        legPrice: 400,
        legKm: 110,
        seatsLeft: 3,
        seatsTotal: 4,
        comment: "Едем через Богашёво",
        driver: {
          id: "driver1",
          firstName: "Алексей",
          lastName: "И.",
          ratingAsDriver: 4.9,
          verified: true,
          carModel: "Kia Rio",
          carColor: "серый",
        },
      };

      const { text, tripUrl } = formatTripCardHtml(mockTrip, "https://poputka70.vercel.app");

      expect(tripUrl).toBe("https://poputka70.vercel.app/trips/trip123");
      expect(text).toContain("Томск → Асино");
      expect(text).toContain("400 ₽");
      expect(text).toContain("3 из 4 мест");
      expect(text).toContain("(по Томску)");
      expect(text).toContain("Алексей И.");
      expect(text).toContain("Kia Rio");
      expect(text).toContain("★ 4.9 ✓ (проверен)");
      expect(text).toContain("Едем через Богашёво");
    });

    it("formats trip card without car and unverified driver gracefully", () => {
      const mockTrip: TripSearchItem = {
        id: "trip456",
        date: new Date("2026-10-25T12:00:00.000Z"),
        departureTime: new Date("2026-10-25T12:00:00.000Z"),
        originName: "Лагерный сад",
        destName: "Аэропорт",
        priceFull: 250,
        legPrice: 250,
        legKm: 20,
        seatsLeft: 1,
        seatsTotal: 3,
        comment: null,
        driver: {
          id: "driver2",
          firstName: "Мария",
          lastName: null,
          ratingAsDriver: 5.0,
          verified: false,
          carModel: null,
          carColor: null,
        },
      };

      const { text, tripUrl } = formatTripCardHtml(mockTrip, "https://poputka70.vercel.app");

      expect(tripUrl).toBe("https://poputka70.vercel.app/trips/trip456");
      expect(text).toContain("Лагерный сад → Аэропорт");
      expect(text).toContain("250 ₽");
      expect(text).toContain("1 из 3 мест");
      expect(text).toContain("Мария");
      expect(text).not.toContain("✓ (проверен)");
      expect(text).not.toContain("💬");
    });

    it("escapes malicious or special HTML characters in origin, destination, comment, and car info", () => {
      const mockTrip: TripSearchItem = {
        id: "trip789",
        date: new Date("2026-10-25T12:00:00.000Z"),
        departureTime: new Date("2026-10-25T12:00:00.000Z"),
        originName: "Остановка <1>",
        destName: "Вокзал & Площадь",
        priceFull: 100,
        legPrice: 100,
        legKm: 5,
        seatsLeft: 2,
        seatsTotal: 4,
        comment: "Не курить! <3",
        driver: {
          id: "driver3",
          firstName: "Иван <Тест>",
          lastName: "П. & С.",
          ratingAsDriver: 4.8,
          verified: true,
          carModel: "Lada <Vesta>",
          carColor: "серебристый & черный",
        },
      };

      const { text } = formatTripCardHtml(mockTrip, "https://poputka70.vercel.app");

      expect(text).toContain("Остановка &lt;1&gt; → Вокзал &amp; Площадь");
      expect(text).toContain("Иван &lt;Тест&gt; П. &amp; С.");
      expect(text).toContain("Lada &lt;Vesta&gt;");
      expect(text).toContain("серебристый &amp; черный");
      expect(text).toContain("Не курить! &lt;3");
      expect(text).not.toContain("<1>");
      expect(text).not.toContain("<Тест>");
      expect(text).not.toContain("<Vesta>");
    });
  });
});

describe("Bot Engine Route Parsing & Limits", () => {
  it("correctly parses multi-word origins and destinations", async () => {
    const { parseRouteText } = await import("../bot/bot-engine");

    expect(parseRouteText("Лагерный сад в Аэропорт")).toEqual({
      from: "Лагерный сад",
      to: "Аэропорт",
    });
    expect(parseRouteText("Площадь Ленина -> Южные Ворота")).toEqual({
      from: "Площадь Ленина",
      to: "Южные Ворота",
    });
    expect(parseRouteText("из Каштака в ТГУ")).toEqual({
      from: "Каштака",
      to: "ТГУ",
    });
    expect(parseRouteText("Томск — Асино")).toEqual({
      from: "Томск",
      to: "Асино",
    });
    expect(parseRouteText("Томск Асино")).toEqual({
      from: "Томск",
      to: "Асино",
    });
    // Проверка остановок с дефисом (не должны ложно разделяться дефисом в названии)
    expect(parseRouteText("Томск-1 в Аэропорт")).toEqual({
      from: "Томск-1",
      to: "Аэропорт",
    });
    expect(parseRouteText("Ж/Д вокзал Томск-1 - Аэропорт")).toEqual({
      from: "Ж/Д вокзал Томск-1",
      to: "Аэропорт",
    });
    expect(parseRouteText("Каштак-1 — Лагерный сад")).toEqual({
      from: "Каштак-1",
      to: "Лагерный сад",
    });
  });

  it("does not falsely treat single hubs or conversational messages as routes", async () => {
    const { parseRouteText } = await import("../bot/bot-engine");

    expect(parseRouteText("Лагерный сад")).toBeNull();
    expect(parseRouteText("Южные Ворота")).toBeNull();
    expect(parseRouteText("Площадь Ленина")).toBeNull();
    expect(parseRouteText("Зелёные Горки")).toBeNull();
    expect(parseRouteText("Привет как дела")).toBeNull();
    expect(parseRouteText("Как найти поездку")).toBeNull();
    expect(parseRouteText("Сколько стоит")).toBeNull();
  });

  it("ensures all POPULAR_HUBS callback_data strings are well under Telegram's 64-byte limit", async () => {
    const { POPULAR_HUBS } = await import("../bot/bot-engine");

    for (let i = 0; i < POPULAR_HUBS.length; i++) {
      const originCb = `s:d:${i}`;
      expect(Buffer.byteLength(originCb, "utf8")).toBeLessThanOrEqual(64);

      for (let j = 0; j < POPULAR_HUBS.length; j++) {
        if (i === j) continue;
        const destCb = `s:t:${i}:${j}`;
        expect(Buffer.byteLength(destCb, "utf8")).toBeLessThanOrEqual(64);

        for (const dateCode of ["today", "tomorrow", "all"]) {
          const dateCb = `s:x:${dateCode}:${i}:${j}`;
          expect(Buffer.byteLength(dateCb, "utf8")).toBeLessThanOrEqual(64);
        }
      }
    }
  });
});
