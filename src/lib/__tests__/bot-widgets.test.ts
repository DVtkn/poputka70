import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  renderSeatMapWidgetHtml,
  buildSeatMapData,
  type SeatMapWidgetParams,
} from "../bot/widgets/seat-map-widget";
import {
  renderRouteTimelineWidgetHtml,
  type RouteTimelineWidgetParams,
} from "../bot/widgets/route-timeline-widget";
import {
  sendWidget,
  editMessageWidgetData,
  answerWidgetQuery,
} from "../bot/telegram-client";
import { formatTripPaymentMessage } from "../bot/formatters";
import { handleWidgetQuery, handleTelegramUpdate } from "../bot/bot-engine";
import { driverRegisterSchema } from "../schemas";
import { prisma } from "../prisma";
import type { TelegramWidgetQuery, TelegramUpdate } from "../bot/types";

// Мокаем глобальный fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("../prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    trip: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    booking: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn((callback: (tx: unknown) => unknown) =>
      callback({
        trip: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        booking: {
          findFirst: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ id: "booking_123" }),
        },
      })
    ),
  },
}));

vi.mock("../bot/booking-notifications", () => ({
  handleBookingCallback: vi.fn(),
  sendBookingRequestToDriver: vi.fn().mockResolvedValue(true),
  sendPassengerBookingDecisionTelegram: vi.fn().mockResolvedValue(true),
}));

describe("Telegram Bot API 10.4 Widgets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.TELEGRAM_BOT_TOKEN = "mock_bot_token";
  });

  describe("Interactive Seat Map Widget", () => {
    const mockParams: SeatMapWidgetParams = {
      tripId: "trip_test_1",
      originName: "Томск (Лагерный сад)",
      destName: "Северск (КПП)",
      departureTimeTomsk: "18 ноября, 09:30",
      price: 250,
      carModel: "Kia Rio",
      seatsTotal: 4,
      seatsLeft: 2,
      seats: [
        { seatNumber: 1, label: "Место 1", status: "occupied", passengerName: "Ольга" },
        { seatNumber: 2, label: "Место 2", status: "free" },
        { seatNumber: 3, label: "Место 3", status: "my_seat", passengerName: "Иван" },
        { seatNumber: 4, label: "Место 4", status: "free" },
      ],
      userBookingSeatNumber: 3,
      appUrl: "https://poputka70.vercel.app",
    };

    it("renders valid self-contained HTML under 32KB", () => {
      const html = renderSeatMapWidgetHtml(mockParams);
      const byteSize = Buffer.byteLength(html, "utf8");

      expect(byteSize).toBeLessThan(32 * 1024);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Томск (Лагерный сад)");
      expect(html).toContain("Северск (КПП)");
      expect(html).toContain("250 ₽");
      expect(html).toContain("Водитель");
      expect(html).toContain("Telegram.sendData");
      expect(html).toContain("onTelegramWidgetData");
    });

    it("escapes user-generated strings in HTML", () => {
      const maliciousParams: SeatMapWidgetParams = {
        ...mockParams,
        originName: '<script>alert("xss")</script>',
        carModel: '<img src=x onerror=alert(1)>',
      };
      const html = renderSeatMapWidgetHtml(maliciousParams);
      expect(html).not.toContain("<script>alert(");
      expect(html).toContain("&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;");
    });

    it("buildSeatMapData caps free seats to availableSeats in database", async () => {
      vi.mocked(prisma.trip.findUnique).mockResolvedValueOnce({
        id: "trip_seat_test",
        seatsTotal: 4,
        availableSeats: 1, // В БД доступно только 1 место
        price: 300,
        departureTime: new Date(Date.now() + 3600 * 1000),
        originName: "Томск",
        destName: "Северск",
        routeTemplate: null,
        driver: {
          id: "drv_1",
          firstName: "Сергей",
          lastName: "П",
          driverProfile: { carModel: "Lada Vesta" },
        },
        bookings: [
          // В таблице только одна бронь, но availableSeats = 1
          {
            id: "b_1",
            passengerId: "p_1",
            note: "Место 1",
            status: "CONFIRMED",
            passenger: { firstName: "Олег" },
          },
        ],
      } as never);

      const data = await buildSeatMapData("trip_seat_test", "my_user_id");
      expect(data).not.toBeNull();
      expect(data?.seatsTotal).toBe(4);
      // Должно остаться ровно 1 свободное место, а не 3!
      expect(data?.seatsLeft).toBe(1);
    });
  });

  describe("Interactive Route Timeline Widget", () => {
    const mockTimelineParams: RouteTimelineWidgetParams = {
      tripId: "trip_test_2",
      originName: "Томск (Южные Ворота)",
      destName: "Томск (Аэропорт Богашёво)",
      departureTimeTomsk: "18 ноября, 08:00",
      totalDistanceKm: 18.5,
      estimatedDurationMinutes: 28,
      stops: [
        { index: 0, name: "Южные Ворота", type: "origin", timeEstimate: "08:00", distanceKm: 0 },
        { index: 1, name: "Зональная Станция", type: "stop", timeEstimate: "08:08 (+8 мин)", distanceKm: 4.5 },
        { index: 2, name: "Богашёво", type: "stop", timeEstimate: "08:18 (+18 мин)", distanceKm: 12.0 },
        { index: 3, name: "Аэропорт", type: "dest", timeEstimate: "08:28 (+28 мин)", distanceKm: 18.5 },
      ],
      appUrl: "https://poputka70.vercel.app",
    };

    it("renders valid self-contained timeline HTML under 32KB", () => {
      const html = renderRouteTimelineWidgetHtml(mockTimelineParams);
      const byteSize = Buffer.byteLength(html, "utf8");

      expect(byteSize).toBeLessThan(32 * 1024);
      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("Южные Ворота");
      expect(html).toContain("Аэропорт");
      expect(html).toContain("Богашёво");
      expect(html).toContain("18.5 км");
      expect(html).toContain("Telegram.sendData");
    });
  });

  describe("Telegram Client Bot API 10.4 Widget Methods", () => {
    it("sendWidget succeeds when Bot API supports it", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 999 } }),
      });

      const res = await sendWidget(123456, "<html>widget</html>", {
        caption: "Карта мест",
        data: { tripId: "trip_1" },
      });

      expect(res.ok).toBe(true);
      expect(res.message_id).toBe(999);
      expect(res.fallbackUsed).toBe(false);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/sendWidget",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            chat_id: 123456,
            widget: "<html>widget</html>",
            caption: "Карта мест",
            data: JSON.stringify({ tripId: "trip_1" }),
          }),
        })
      );
    });

    it("sendWidget falls back to classic sendMessage if Bot API returns error", async () => {
      // 1. sendWidget fails (e.g. 400 Bad Request or unsupported method)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "Method not found or widgets unsupported",
      });

      // 2. sendMessage fallback succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ok: true, result: { message_id: 1000 } }),
      });

      const res = await sendWidget(123456, "<html>widget</html>", {
        caption: "Карта мест",
        fallbackText: "🚗 Карточка рейса (фоллбэк)",
        reply_markup: {
          inline_keyboard: [[{ text: "Открыть", url: "https://poputka70.vercel.app" }]],
        },
      });

      expect(res.ok).toBe(true);
      expect(res.fallbackUsed).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenLastCalledWith(
        "https://api.telegram.org/botmock_bot_token/sendMessage",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            chat_id: 123456,
            text: "🚗 Карточка рейса (фоллбэк)",
            reply_markup: {
              inline_keyboard: [[{ text: "Открыть", url: "https://poputka70.vercel.app" }]],
            },
            disable_web_page_preview: true,
            parse_mode: "HTML",
          }),
        })
      );
    });

    it("editMessageWidgetData calls Telegram API correctly", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const ok = await editMessageWidgetData(123456, 777, { updated: true });
      expect(ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/editMessageWidgetData",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            chat_id: 123456,
            message_id: 777,
            data: JSON.stringify({ updated: true }),
          }),
        })
      );
    });

    it("answerWidgetQuery calls Telegram API correctly", async () => {
      mockFetch.mockResolvedValueOnce({ ok: true });

      const ok = await answerWidgetQuery("query_abc_123", "Место забронировано!", false);
      expect(ok).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/answerWidgetQuery",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            widget_query_id: "query_abc_123",
            text: "Место забронировано!",
            show_alert: false,
          }),
        })
      );
    });
  });

  describe("Widget Query Update Handler", () => {
    it("handles select_seat widget_query: books seat and updates widget", async () => {
      // Мокаем ответы Prisma
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user_passenger_1",
        firstName: "Алексей",
        status: "ACTIVE",
      } as never);

      const futureDate = new Date(Date.now() + 2 * 3600 * 1000);
      vi.mocked(prisma.trip.findUnique).mockResolvedValueOnce({
        id: "trip_100",
        status: "SCHEDULED",
        departureTime: futureDate,
        driverId: "user_driver_99",
        autoAccept: true,
        price: 200,
        originName: "Лагерный сад",
        destName: "Северск",
        availableSeats: 3,
        routeTemplate: null,
      } as never);

      // Ни активной брони пользователя, ни занятого кресла №2
      vi.mocked(prisma.booking.findFirst).mockResolvedValue(null as never);

      // answerWidgetQuery и editMessageWidgetData
      mockFetch.mockResolvedValue({ ok: true });

      const updateQuery: TelegramWidgetQuery = {
        id: "wq_12345",
        from: { id: 987654321, is_bot: false, first_name: "Алексей" },
        message: {
          message_id: 555,
          chat: { id: 987654321, type: "private" },
          date: Math.floor(Date.now() / 1000),
        },
        data: JSON.stringify({
          action: "select_seat",
          tripId: "trip_100",
          seatNumber: 2,
        }),
      };

      await handleWidgetQuery(updateQuery);

      // Проверяем, что ответ через answerWidgetQuery был вызван
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/answerWidgetQuery",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Место №2 успешно забронировано!"),
        })
      );
    });

    it("prevents driver from booking their own trip", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user_driver_99",
        firstName: "Водитель",
        status: "ACTIVE",
      } as never);

      vi.mocked(prisma.trip.findUnique).mockResolvedValueOnce({
        id: "trip_100",
        status: "SCHEDULED",
        departureTime: new Date(Date.now() + 3600 * 1000),
        driverId: "user_driver_99",
        autoAccept: true,
        price: 200,
        originName: "Лагерный сад",
        destName: "Северск",
        availableSeats: 3,
        routeTemplate: null,
      } as never);

      mockFetch.mockResolvedValueOnce({ ok: true });

      const updateQuery: TelegramWidgetQuery = {
        id: "wq_driver_error",
        from: { id: 999999, is_bot: false, first_name: "Водитель" },
        data: JSON.stringify({
          action: "select_seat",
          tripId: "trip_100",
          seatNumber: 1,
        }),
      };

      await handleWidgetQuery(updateQuery);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/answerWidgetQuery",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Это ваша поездка"),
        })
      );
    });

    it("prevents booking an already occupied seat and updates widget", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "user_passenger_2",
        firstName: "Борис",
        status: "ACTIVE",
      } as never);

      vi.mocked(prisma.trip.findUnique).mockResolvedValueOnce({
        id: "trip_100",
        status: "SCHEDULED",
        departureTime: new Date(Date.now() + 3600 * 1000),
        driverId: "user_driver_99",
        autoAccept: true,
        price: 200,
        originName: "Лагерный сад",
        destName: "Северск",
        availableSeats: 2,
        routeTemplate: null,
      } as never);

      // Проверка на существующую бронь пользователя (нет)
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce(null as never);

      // Проверка на занятость кресла №1 (уже занято другим пассажиром)
      vi.mocked(prisma.booking.findFirst).mockResolvedValueOnce({
        id: "booking_existing_seat_1",
      } as never);

      mockFetch.mockResolvedValue({ ok: true });

      const updateQuery: TelegramWidgetQuery = {
        id: "wq_occupied_seat",
        from: { id: 777777, is_bot: false, first_name: "Борис" },
        message: {
          message_id: 888,
          chat: { id: 777777, type: "private" },
          date: Math.floor(Date.now() / 1000),
        },
        data: JSON.stringify({
          action: "select_seat",
          tripId: "trip_100",
          seatNumber: 1,
        }),
      };

      await handleWidgetQuery(updateQuery);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/answerWidgetQuery",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Место №1 уже занято"),
        })
      );
    });

    it("handles select_stop widget query and calls editMessageWidgetData", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      const updateQuery: TelegramWidgetQuery = {
        id: "wq_stop_choice",
        from: { id: 12345, is_bot: false, first_name: "Анна" },
        message: {
          message_id: 456,
          chat: { id: 12345, type: "private" },
          date: Math.floor(Date.now() / 1000),
        },
        data: JSON.stringify({
          action: "select_stop",
          tripId: "trip_100",
          stopName: "Лагерный сад",
          type: "pickup",
        }),
      };

      await handleWidgetQuery(updateQuery);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/answerWidgetQuery",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("Точка посадки выбрана: Лагерный сад"),
        })
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/editMessageWidgetData",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("update_stop"),
        })
      );
    });
  });

  describe("Callback Query w:seats: and w:route: dismissal", () => {
    it("answers callback query immediately when w:seats: or w:route: is clicked", async () => {
      mockFetch.mockResolvedValue({ ok: true });

      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "user_test",
        firstName: "Иван",
        status: "ACTIVE",
      } as never);

      const callbackUpdate: TelegramUpdate = {
        update_id: 101,
        callback_query: {
          id: "cq_widget_seats_123",
          from: { id: 55555, is_bot: false, first_name: "Иван" },
          data: "w:seats:trip_test_1",
          message: {
            message_id: 12,
            chat: { id: 55555, type: "private" },
            date: Math.floor(Date.now() / 1000),
          },
        },
      };

      await handleTelegramUpdate(callbackUpdate);

      // Проверяем, что answerCallbackQuery был вызван для разблокировки UI кнопки
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.telegram.org/botmock_bot_token/answerCallbackQuery",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("cq_widget_seats_123"),
        })
      );
    });
  });

  describe("Driver bank card registration schema", () => {
    it("validates valid bank card numbers in driverRegisterSchema", () => {
      const valid = driverRegisterSchema.safeParse({
        carModel: "Toyota Camry",
        carNumber: "А123ВС70",
        bankCardNumber: "2200 1234 5678 9012",
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.bankCardNumber).toBe("2200 1234 5678 9012");
      }
    });

    it("allows omitting bankCardNumber in driverRegisterSchema", () => {
      const valid = driverRegisterSchema.safeParse({
        carModel: "Toyota Camry",
        carNumber: "А123ВС70",
      });
      expect(valid.success).toBe(true);
    });
  });

  describe("MessageEntity bank_card_number support", () => {
    it("formats payment message with bank_card_number entity at exact offset", () => {
      const cardNumber = "2200 1234 5678 9012";
      const result = formatTripPaymentMessage({
        originName: "Лагерный сад",
        destName: "Северск",
        amount: 250,
        driverName: "Александр",
        driverPhone: "+79991234567",
        bankCardNumber: cardNumber,
        bankName: "Сбер",
      });

      expect(result.text).toContain(cardNumber);
      expect(result.text).toContain("Сумма к оплате водителю: 250 ₽");

      const cardEntity = result.entities.find((e) => e.type === "bank_card_number");
      expect(cardEntity).toBeDefined();
      expect(cardEntity?.length).toBe(cardNumber.length);

      // Проверяем точное совпадение смещения в тексте
      const substringAtOffset = result.text.substring(
        cardEntity!.offset,
        cardEntity!.offset + cardEntity!.length
      );
      expect(substringAtOffset).toBe(cardNumber);

      // Проверяем жирный заголовок
      const boldEntity = result.entities.find((e) => e.type === "bold");
      expect(boldEntity).toBeDefined();
      expect(boldEntity?.offset).toBe(0);
    });

    it("formats fallback payment message when driver has no card number", () => {
      const result = formatTripPaymentMessage({
        originName: "Лагерный сад",
        destName: "Северск",
        amount: 250,
        driverName: "Александр",
        bankCardNumber: null,
      });

      expect(result.text).toContain("Оплатите поездку водителю наличными или переводом");
      const cardEntity = result.entities.find((e) => e.type === "bank_card_number");
      expect(cardEntity).toBeUndefined();
    });
  });
});
