import { describe, expect, it } from "vitest";
import {
  chatMessageSchema,
  loginSchema,
  registerSchema,
  reviewCreateSchema,
  routeCreateSchema,
  stopsQuerySchema,
} from "@/lib/schemas";

describe("схемы валидации", () => {
  it("stopsQuerySchema: пропускает limit до 100 и валидирует координаты", () => {
    expect(stopsQuerySchema.safeParse({ limit: 100 }).success).toBe(true);
    expect(stopsQuerySchema.safeParse({ limit: 101 }).success).toBe(false);
    expect(stopsQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(stopsQuerySchema.safeParse({ lat: "56.468", lng: "84.954", limit: "10" }).success).toBe(true);
    expect(stopsQuerySchema.safeParse({ lat: 95 }).success).toBe(false);
    expect(stopsQuerySchema.safeParse({ lat: 56.468 }).success).toBe(false);
    expect(stopsQuerySchema.safeParse({ lng: 84.954 }).success).toBe(false);
  });
  it("отклоняет отрицательную цену и нулевые места", () => {
    const base = {
      originId: "a",
      destId: "b",
      departureTime: "08:00",
      daysOfWeek: [1, 2],
      seats: 3,
      price: 150,
    };
    expect(routeCreateSchema.safeParse(base).success).toBe(true);
    expect(routeCreateSchema.safeParse({ ...base, price: -100 }).success).toBe(false);
    expect(routeCreateSchema.safeParse({ ...base, seats: 0 }).success).toBe(false);
    expect(routeCreateSchema.safeParse({ ...base, seats: 9 }).success).toBe(false);
    expect(routeCreateSchema.safeParse({ ...base, daysOfWeek: [] }).success).toBe(false);
    expect(routeCreateSchema.safeParse({ ...base, departureTime: "25:99" }).success).toBe(false);
  });

  it("отклоняет дробный рейтинг и пустой комментарий-границы", () => {
    expect(reviewCreateSchema.safeParse({ bookingId: "x", rating: 4.9 }).success).toBe(false);
    expect(reviewCreateSchema.safeParse({ bookingId: "x", rating: 5 }).success).toBe(true);
    expect(reviewCreateSchema.safeParse({ bookingId: "x", rating: 5, comment: "a".repeat(501) }).success).toBe(false);
  });

  it("регистрация: пускает латиницу с цифрами, отклоняет пробелы", () => {
    const payload = { login: "ivan_70", password: "secret1", firstName: "Иван" };
    expect(registerSchema.safeParse(payload).success).toBe(true);
    expect(registerSchema.safeParse({ ...payload, login: "иван" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...payload, password: "123" }).success).toBe(false);
  });

  it("логин требует минимум 3 символа", () => {
    expect(loginSchema.safeParse({ login: "ab", password: "secret1" }).success).toBe(false);
  });

  it("сообщения чата: валидирует длину от 1 до 1000 символов и триммит", () => {
    expect(chatMessageSchema.safeParse({ text: "Привет" }).success).toBe(true);
    expect(chatMessageSchema.safeParse({ text: "" }).success).toBe(false);
    expect(chatMessageSchema.safeParse({ text: "   " }).success).toBe(false);
    const longValid = "Привет, водитель! Буду ждать на остановке через 10 минут. ".repeat(15);
    expect(chatMessageSchema.safeParse({ text: longValid }).success).toBe(true);
    expect(chatMessageSchema.safeParse({ text: "a".repeat(1001) }).success).toBe(false);
    expect(chatMessageSchema.safeParse({ text: "Пишите мне в t.me/spam" }).success).toBe(false);
  });
});

