import { describe, expect, it } from "vitest";
import { apiError } from "@/lib/api-client";

describe("apiError", () => {
  it("разбирает новый конверт { error: { code, message } }", () => {
    expect(apiError({ error: { code: "CONFLICT", message: "Мест нет" } }, "fallback")).toEqual({
      code: "CONFLICT",
      message: "Мест нет",
    });
  });

  it("поддерживает строковый error для совместимости", () => {
    expect(apiError({ error: "Старый формат" }, "fallback")).toEqual({ code: null, message: "Старый формат" });
  });

  it("возвращает fallback, если ошибки нет", () => {
    expect(apiError(null, "Запасной текст")).toEqual({ code: null, message: "Запасной текст" });
  });
});
