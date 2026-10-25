import { describe, expect, it } from "vitest";
import {
  detectSpam,
  validateCarNumber,
  validateTripPrice,
  isHoneypotTriggered,
  MIN_TRIP_PRICE,
  MAX_TRIP_PRICE,
} from "../spam-filter";

describe("detectSpam", () => {
  it("пропускает чистый текст комментария", () => {
    expect(detectSpam("Поеду через Комсомольский, заберу на остановке").isSpam).toBe(false);
    expect(detectSpam("").isSpam).toBe(false);
    expect(detectSpam(null).isSpam).toBe(false);
  });

  it("блокирует внешние ссылки и мессенджеры", () => {
    expect(detectSpam("Пишите мне в t.me/tomsk_driver").isSpam).toBe(true);
    expect(detectSpam("Подробности на https://my-site.ru").isSpam).toBe(true);
    expect(detectSpam("wa.me/79991234567").isSpam).toBe(true);
    expect(detectSpam("Вступай в группу vk.com/rides").isSpam).toBe(true);
  });

  it("блокирует подозрительные спам-домены", () => {
    expect(detectSpam("Заходи на win-cash.casino").isSpam).toBe(true);
    expect(detectSpam("Быстрые деньги на easy.click").isSpam).toBe(true);
  });

  it("блокирует стоп-слова (казино, крипта, закладки)", () => {
    expect(detectSpam("1xbet лучшие ставки").isSpam).toBe(true);
    expect(detectSpam("Быстрый заработок от 5000 в день").isSpam).toBe(true);
    expect(detectSpam("казино вулкан дарит бонус").isSpam).toBe(true);
  });

  it("блокирует флуд повторяющимися символами", () => {
    expect(detectSpam("Привет!!!!!!!!!!!!!!!!!!!").isSpam).toBe(true);
    expect(detectSpam("Ааааааааааааааааааа").isSpam).toBe(true);
  });
});

describe("validateCarNumber", () => {
  it("принимает стандартный российский номер с регионом", () => {
    const res = validateCarNumber("А123ВС70");
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe("А123ВС 70");
  });

  it("принимает латинские буквы и конвертирует в кириллицу", () => {
    const res = validateCarNumber("a123bc70");
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe("А123ВС 70");
  });

  it("добавляет регион по умолчанию (70) если не указан", () => {
    const res = validateCarNumber("М456ОТ");
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe("М456ОТ 70");
  });

  it("отклоняет заведомо мусорные номера", () => {
    expect(validateCarNumber("123").valid).toBe(false);
    expect(validateCarNumber("ТЕСТ").valid).toBe(false);
    expect(validateCarNumber("").valid).toBe(false);
  });
});

describe("validateTripPrice", () => {
  it("разрешает адекватную цену в Томске", () => {
    expect(validateTripPrice(100).valid).toBe(true);
    expect(validateTripPrice(250).valid).toBe(true);
  });

  it("отклоняет слишком маленькую или отрицательную цену", () => {
    expect(validateTripPrice(0).valid).toBe(false);
    expect(validateTripPrice(MIN_TRIP_PRICE - 1).valid).toBe(false);
    expect(validateTripPrice(-50).valid).toBe(false);
  });

  it("отклоняет завышенную цену", () => {
    expect(validateTripPrice(MAX_TRIP_PRICE + 1).valid).toBe(false);
    expect(validateTripPrice(50000).valid).toBe(false);
  });
});

describe("isHoneypotTriggered", () => {
  it("возвращает false для легитимного пользователя", () => {
    expect(isHoneypotTriggered({ login: "alex", password: "secretPassword1" })).toBe(false);
    expect(isHoneypotTriggered({ login: "alex", hpWebsite: "" })).toBe(false);
  });

  it("возвращает true если бот заполнил невидимое поле", () => {
    expect(isHoneypotTriggered({ login: "bot", hpWebsite: "http://spam.com" })).toBe(true);
  });
});
