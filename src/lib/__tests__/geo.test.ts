import { describe, expect, it } from "vitest";
import { projectOnSegment, segmentLengthKm } from "@/lib/geo";
import { legPrice, publicationDates } from "@/lib/trip-rules";

describe("geo: коридор маршрута", () => {
  it("длина отрезка считается в километрах", () => {
    const km = segmentLengthKm({ lat: 56.49, lng: 84.95 }, { lat: 56.51, lng: 84.95 });
    expect(km).toBeGreaterThan(2);
    expect(km).toBeLessThan(2.5);
  });

  it("точка на линии даёт нулевое расстояние и верную долю", () => {
    const a = { lat: 56.5, lng: 84.9 };
    const b = { lat: 56.5, lng: 85.0 };
    const middle = projectOnSegment({ lat: 56.5, lng: 84.95 }, a, b);
    expect(middle.distanceKm).toBeLessThan(0.05);
    expect(middle.fraction).toBeGreaterThan(0.45);
    expect(middle.fraction).toBeLessThan(0.55);
  });

  it("точка в стороне отклоняется", () => {
    const projection = projectOnSegment({ lat: 56.52, lng: 84.95 }, { lat: 56.5, lng: 84.9 }, { lat: 56.5, lng: 85.0 });
    expect(projection.distanceKm).toBeGreaterThan(2);
  });
});

describe("pricing отрезка", () => {
  it("короткий отрезок не дешевле 50 ₽ и округляется до 10 ₽", () => {
    expect(legPrice(200, 10, 1)).toBe(50);
    expect(legPrice(200, 10, 3)).toBe(60);
  });
  it("полный отрезок равен полной цене", () => {
    expect(legPrice(150, 8, 8)).toBe(150);
  });
});

describe("публикация серии", () => {
  it("будни создают только рабочие дни", () => {
    const dates = publicationDates(new Date(Date.UTC(2026, 9, 14)), "weekdays"); // среда
    expect(dates).toHaveLength(10);
    expect(dates.some((date) => date.getUTCDay() === 6 || date.getUTCDay() === 0)).toBe(false);
  });
  it("разовая поездка — одна дата", () => {
    const dates = publicationDates(new Date(Date.UTC(2026, 9, 14)), "none");
    expect(dates).toHaveLength(1);
  });
});
