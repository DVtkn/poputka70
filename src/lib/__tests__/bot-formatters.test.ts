import { describe, it, expect } from "vitest";
import { escapeHtml, formatTripDateTomsk, formatTripCardHtml } from "../bot/formatters";
import type { TripSearchItem } from "@/lib/trips";

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
      expect(text).toContain("★ 4.9 ✓ (верен)");
      expect(text).toContain("Едем через Богашёво");
    });
  });
});
