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

  it("сервисный сбор — 15% с округлением", () => {
    expect(calculateServiceFee(120)).toBe(18);
    expect(calculateServiceFee(100)).toBe(15);
  });

  it("итог = компенсация + сбор", () => {
    expect(calculateTotal(120)).toBe(138);
  });
});
