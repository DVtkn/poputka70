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
      const date = new Date("2026-10-25T12:00:00.000Z");
      const formatted = formatTripDateTomsk(date);
      expect(formatted).toContain("19:00");
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
      expect(text).toContain("Алексей");
      expect(text).toContain("Kia Rio");
      expect(text).toContain("★ 4.9 ✓ (проверен)");
      expect(text).toContain("Едем через Богашёво");
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
