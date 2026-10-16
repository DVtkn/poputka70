import { describe, expect, it } from "vitest";
import {
  PRICING_CONFIG,
  calculateCompensation,
  calculateServiceFee,
  calculateTotal,
} from "@/lib/pricing";

describe("pricing", () => {
  it("утренний пик добавляет множитель 1.2", () => {
    expect(calculateCompensation(10, "08:00")).toBe(100);
  });

  it("ночной тариф — множитель 1.5", () => {
    expect(calculateCompensation(10, "23:00")).toBe(120);
  });

  it("минимальная цена не ниже minPrice", () => {
    expect(calculateCompensation(1, "12:00")).toBe(PRICING_CONFIG.minPrice);
  });

  it("сервисный сбор считается от настройки (на старте — 0: платформа бесплатна)", () => {
    expect(calculateServiceFee(120)).toBe(Math.round((120 * PRICING_CONFIG.serviceFeePercent) / 100));
    expect(calculateServiceFee(120)).toBe(0);
  });

  it("итог = компенсация + сбор", () => {
    expect(calculateTotal(120)).toBe(120 + calculateServiceFee(120));
  });
});
