import { describe, expect, it } from "vitest";
import {
  addDaysUtc,
  dayOfWeekUtc,
  instantFromTomsk,
  isoDateUtc,
  tomskParts,
  tomskTodayUtc,
} from "@/lib/time";

describe("time (Asia/Tomsk, UTC+7)", () => {
  it("instantFromTomsk переводит местное время в истинный UTC-инстант", () => {
    const date = new Date(Date.UTC(2026, 9, 14));
    const instant = instantFromTomsk(date, "08:00");
    expect(instant.toISOString()).toBe("2026-10-14T01:00:00.000Z");
  });

  it("tomskParts учитывает смещение +7", () => {
    const parts = tomskParts(new Date("2026-10-13T15:00:00Z"));
    expect(parts.hours).toBe(22);
    expect(parts.day).toBe(13);
  });

  it("tomskTodayUtc возвращает UTC-полночь календарного дня Томска", () => {
    const today = tomskTodayUtc(new Date("2026-10-13T20:00:00Z")); // 14 октября 03:00 по Томску
    expect(isoDateUtc(today)).toBe("2026-10-14");
  });

  it("addDaysUtc и dayOfWeekUtc", () => {
    const date = new Date(Date.UTC(2026, 9, 13)); // вторник
    expect(dayOfWeekUtc(date)).toBe(2);
    expect(isoDateUtc(addDaysUtc(date, 1))).toBe("2026-10-14");
  });
});
