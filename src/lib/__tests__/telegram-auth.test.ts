import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifyTelegramInitData, verifyTelegramWidgetData } from "../bot/telegram-auth";

describe("Telegram Authentication verification", () => {
  const dummyBotToken = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";

  describe("verifyTelegramInitData", () => {
    it("validates authentic Telegram WebApp initData", () => {
      const authDate = Math.floor(Date.now() / 1000);
      const userObj = { id: 987654321, first_name: "Иван", username: "ivan_tomsk" };
      const userStr = JSON.stringify(userObj);

      const params = [
        `auth_date=${authDate}`,
        `query_id=AAHdF6IQAAAAAN0XohD90j3_`,
        `user=${userStr}`,
      ];
      params.sort();
      const dataCheckString = params.join("\n");

      const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(dummyBotToken)
        .digest();

      const hash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      const initData = `${params.join("&")}&hash=${hash}`;

      const result = verifyTelegramInitData(initData, dummyBotToken);

      expect(result.valid).toBe(true);
      expect(result.user?.id).toBe(987654321);
      expect(result.user?.first_name).toBe("Иван");
      expect(result.user?.username).toBe("ivan_tomsk");
    });

    it("rejects tampered or forged initData", () => {
      const initData = "auth_date=1600000000&query_id=fake&user=%7B%22id%22%3A123%7D&hash=invalidhash123";
      const result = verifyTelegramInitData(initData, dummyBotToken);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid hash signature");
    });

    it("rejects expired initData", () => {
      const oldAuthDate = Math.floor(Date.now() / 1000) - 100000; // older than 24h
      const params = [`auth_date=${oldAuthDate}`, `query_id=AAHdF6`];
      params.sort();
      const dataCheckString = params.join("\n");

      const secretKey = crypto
        .createHmac("sha256", "WebAppData")
        .update(dummyBotToken)
        .digest();

      const hash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      const initData = `${params.join("&")}&hash=${hash}`;
      const result = verifyTelegramInitData(initData, dummyBotToken);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("expired");
    });
  });

  describe("verifyTelegramWidgetData", () => {
    it("validates authentic Telegram Login Widget data", () => {
      const authDate = Math.floor(Date.now() / 1000);
      const widgetPayload = {
        id: 11223344,
        first_name: "Анна",
        last_name: "Сибирская",
        username: "anna_s",
        auth_date: authDate,
      };

      const pairs = [
        `auth_date=${authDate}`,
        `first_name=Анна`,
        `id=11223344`,
        `last_name=Сибирская`,
        `username=anna_s`,
      ];
      pairs.sort();
      const dataCheckString = pairs.join("\n");

      const secretKey = crypto.createHash("sha256").update(dummyBotToken).digest();
      const hash = crypto
        .createHmac("sha256", secretKey)
        .update(dataCheckString)
        .digest("hex");

      const fullData = { ...widgetPayload, hash };
      const result = verifyTelegramWidgetData(fullData, dummyBotToken);

      expect(result.valid).toBe(true);
      expect(result.user?.id).toBe(11223344);
      expect(result.user?.first_name).toBe("Анна");
      expect(result.user?.username).toBe("anna_s");
    });
  });
});
