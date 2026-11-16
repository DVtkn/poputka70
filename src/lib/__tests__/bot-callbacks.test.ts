import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  handleBookingCallback,
  sendBookingRequestToDriver,
  sendPassengerBookingDecisionTelegram,
} from "../bot/booking-notifications";
import {
  sendTelegramMessage,
  editTelegramMessage,
  answerTelegramCallback,
} from "../bot/telegram-client";
import { prisma } from "@/lib/prisma";
import * as bookingsModule from "@/lib/bookings";
import * as pushModule from "@/lib/push";
import type { TelegramCallbackQuery } from "../bot/types";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    booking: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/bookings", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bookings")>("@/lib/bookings");
  return {
    ...actual,
    cancelBooking: vi.fn(),
  };
});

vi.mock("@/lib/push", () => ({
  createNotificationPayload: vi.fn((title, body) => ({ title, body })),
  sendNotificationToUser: vi.fn().mockResolvedValue(1),
}));

vi.mock("../bot/telegram-client", async () => {
  const actual = await vi.importActual<typeof import("../bot/telegram-client")>(
    "../bot/telegram-client"
  );
  return {
    ...actual,
    sendTelegramMessage: vi.fn().mockResolvedValue(true),
    editTelegramMessage: vi.fn().mockResolvedValue(true),
    answerTelegramCallback: vi.fn().mockResolvedValue(true),
  };
});

describe("Bot Booking Callbacks & Notifications", () => {
  const mockBooking = {
    id: "booking_123",
    tripId: "trip_456",
    passengerId: "passenger_789",
    status: "PENDING",
    pickupName: "Лагерный сад",
    dropoffName: "Площадь Ленина",
    amountDue: 200,
    compensationAmount: 200,
    note: "С чемоданом",
    autoAccepted: false,
    passenger: {
      id: "passenger_789",
      firstName: "Иван",
      lastName: "Иванов",
      phone: "+79991112233",
      telegramId: "777001",
      ratingAsPassenger: 4.9,
    },
    trip: {
      id: "trip_456",
      departureTime: new Date("2026-10-25T12:00:00.000Z"),
      originName: "Томск",
      destName: "Северск",
      originLat: 56.45,
      originLng: 84.95,
      destLat: 56.59,
      destLng: 84.88,
      price: 200,
      seatsTotal: 4,
      comment: null,
      driverId: "driver_999",
      driver: {
        id: "driver_999",
        telegramId: "888001",
        firstName: "Алексей",
        lastName: "Смирнов",
        phone: "+79998887766",
        driverProfile: {
          carModel: "Skoda Octavia",
          carColor: "серый",
          carNumber: "а123то70",
        },
      },
      routeTemplate: null,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Security: Driver ownership verification", () => {
    it("blocks action and warns if caller Telegram ID does not match trip driver Telegram ID", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as never);

      const query: TelegramCallbackQuery = {
        id: "cb_unauth_1",
        from: { id: 999999, is_bot: false, first_name: "Hacker" }, // different from 888001
        data: "b:acc:booking_123",
      };

      await handleBookingCallback(query, "acc", "booking_123");

      expect(answerTelegramCallback).toHaveBeenCalledWith(
        "cb_unauth_1",
        "Это действие доступно только водителю этой поездки",
        true
      );
      expect(prisma.booking.updateMany).not.toHaveBeenCalled();
      expect(bookingsModule.cancelBooking).not.toHaveBeenCalled();
    });

    it("returns warning if booking is not found", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(null as never);

      const query: TelegramCallbackQuery = {
        id: "cb_not_found",
        from: { id: 888001, is_bot: false, first_name: "Driver" },
        data: "b:acc:nonexistent",
      };

      await handleBookingCallback(query, "acc", "nonexistent");

      expect(answerTelegramCallback).toHaveBeenCalledWith(
        "cb_not_found",
        "Заявка не найдена",
        true
      );
      expect(prisma.booking.updateMany).not.toHaveBeenCalled();
    });
  });

  describe("Driver Approval: Action 'acc'", () => {
    it("successfully confirms booking, updates message, answers callback, and notifies passenger", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as never);
      vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 1 });
      vi.mocked(prisma.notification.create).mockResolvedValue({ id: "notif_1" } as never);

      const query: TelegramCallbackQuery = {
        id: "cb_acc_1",
        from: { id: 888001, is_bot: false, first_name: "Driver" },
        message: {
          message_id: 42,
          chat: { id: 888001, type: "private" },
          date: 1700000000,
        },
        data: "b:acc:booking_123",
      };

      await handleBookingCallback(query, "acc", "booking_123");

      // 1. CAS update in database
      expect(prisma.booking.updateMany).toHaveBeenCalledWith({
        where: { id: "booking_123", status: "PENDING" },
        data: expect.objectContaining({ status: "CONFIRMED" }),
      });

      // 2. Answer callback query
      expect(answerTelegramCallback).toHaveBeenCalledWith("cb_acc_1", "Заявка одобрена!");

      // 3. Edit original Telegram message in driver chat
      expect(editTelegramMessage).toHaveBeenCalledWith(
        888001,
        42,
        expect.stringContaining("Заявка одобрена"),
        expect.any(Object)
      );

      // 4. In-app and push notification to passenger
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: "passenger_789",
            type: "BOOKING_ACCEPTED",
          }),
        })
      );
      expect(pushModule.sendNotificationToUser).toHaveBeenCalledWith("passenger_789", expect.any(Object));

      // 5. Telegram notification to passenger
      expect(sendTelegramMessage).toHaveBeenCalledWith(
        "777001",
        expect.stringContaining("поездка подтверждена"),
        expect.any(Object)
      );
    });
  });

  describe("Driver Rejection: Action 'dec'", () => {
    it("cancels booking, returns available seat (+1), edits message, and notifies passenger", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as never);
      vi.mocked(bookingsModule.cancelBooking).mockResolvedValue({ cancelled: true, refunded: false });

      const query: TelegramCallbackQuery = {
        id: "cb_dec_1",
        from: { id: 888001, is_bot: false, first_name: "Driver" },
        message: {
          message_id: 43,
          chat: { id: 888001, type: "private" },
          date: 1700000000,
        },
        data: "b:dec:booking_123",
      };

      await handleBookingCallback(query, "dec", "booking_123");

      // 1. Calls cancelBooking with DRIVER initiator
      expect(bookingsModule.cancelBooking).toHaveBeenCalledWith(
        "booking_123",
        "DRIVER",
        expect.any(Date),
        expect.objectContaining({
          bodyOverride: expect.stringContaining("водитель не смог взять тебя"),
        })
      );

      // 2. Callback response
      expect(answerTelegramCallback).toHaveBeenCalledWith("cb_dec_1", "Заявка отклонена");

      // 3. Driver message edited to reflect rejection
      expect(editTelegramMessage).toHaveBeenCalledWith(
        888001,
        43,
        expect.stringContaining("Заявка отклонена"),
        expect.any(Object)
      );

      // 4. Passenger notified via Telegram
      expect(sendTelegramMessage).toHaveBeenCalledWith(
        "777001",
        expect.stringContaining("не смог подтвердить поездку"),
        expect.any(Object)
      );
    });
  });

  describe("Idempotency & Concurrent Clicks", () => {
    it("notifies driver and updates message without re-processing when booking is already confirmed", async () => {
      const alreadyConfirmed = {
        ...mockBooking,
        status: "CONFIRMED",
      };
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(alreadyConfirmed as never);

      const query: TelegramCallbackQuery = {
        id: "cb_repeat_1",
        from: { id: 888001, is_bot: false, first_name: "Driver" },
        message: {
          message_id: 42,
          chat: { id: 888001, type: "private" },
          date: 1700000000,
        },
        data: "b:acc:booking_123",
      };

      await handleBookingCallback(query, "acc", "booking_123");

      expect(answerTelegramCallback).toHaveBeenCalledWith(
        "cb_repeat_1",
        "Заявка уже обработана",
        false
      );
      expect(prisma.booking.updateMany).not.toHaveBeenCalled();
      expect(bookingsModule.cancelBooking).not.toHaveBeenCalled();
      expect(editTelegramMessage).toHaveBeenCalledWith(
        888001,
        42,
        expect.stringContaining("Заявка одобрена"),
        expect.any(Object)
      );
    });

    it("handles race condition where updateMany returns count 0 gracefully", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as never);
      vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 0 });

      const query: TelegramCallbackQuery = {
        id: "cb_race_1",
        from: { id: 888001, is_bot: false, first_name: "Driver" },
        data: "b:acc:booking_123",
      };

      await handleBookingCallback(query, "acc", "booking_123");

      expect(answerTelegramCallback).toHaveBeenCalledWith(
        "cb_race_1",
        "Заявка уже обработана",
        false
      );
    });
  });

  describe("sendBookingRequestToDriver", () => {
    it("sends message with inline approval buttons when autoAccepted is false", async () => {
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(mockBooking as never);

      const sent = await sendBookingRequestToDriver("booking_123");
      expect(sent).toBe(true);

      expect(sendTelegramMessage).toHaveBeenCalledWith(
        "888001",
        expect.stringContaining("Новая заявка на поездку"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: "✅ Одобрить", callback_data: "b:acc:booking_123" }),
                expect.objectContaining({ text: "❌ Отклонить", callback_data: "b:dec:booking_123" }),
              ]),
            ]),
          }),
        })
      );
    });

    it("sends informational message without approval buttons when autoAccepted is true", async () => {
      const autoAcceptedBooking = {
        ...mockBooking,
        autoAccepted: true,
      };
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(autoAcceptedBooking as never);

      const sent = await sendBookingRequestToDriver("booking_123");
      expect(sent).toBe(true);

      expect(sendTelegramMessage).toHaveBeenCalledWith(
        "888001",
        expect.stringContaining("Новый попутчик!"),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: "🚗 Открыть поездку" }),
              ]),
            ]),
          }),
        })
      );
    });

    it("silently skips if driver has no telegramId", async () => {
      const bookingNoTg = {
        ...mockBooking,
        trip: {
          ...mockBooking.trip,
          driver: {
            ...mockBooking.trip.driver,
            telegramId: null,
          },
        },
      };
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(bookingNoTg as never);

      const sent = await sendBookingRequestToDriver("booking_123");
      expect(sent).toBe(false);
      expect(sendTelegramMessage).not.toHaveBeenCalled();
    });
  });

  describe("sendPassengerBookingDecisionTelegram", () => {
    it("silently skips when passenger has no telegramId", async () => {
      const passengerNoTg = {
        ...mockBooking,
        passenger: {
          ...mockBooking.passenger,
          telegramId: null,
        },
      };
      vi.mocked(prisma.booking.findUnique).mockResolvedValue(passengerNoTg as never);

      const result = await sendPassengerBookingDecisionTelegram("booking_123", "CONFIRMED");
      expect(result).toBe(false);
      expect(sendTelegramMessage).not.toHaveBeenCalled();
    });
  });
});

describe("Telegram Client Fail-Safe Resilience", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("returns false instead of throwing unhandled exception when TELEGRAM_BOT_TOKEN is unset", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const actualClient = await vi.importActual<typeof import("../bot/telegram-client")>(
      "../bot/telegram-client"
    );

    const sendRes = await actualClient.sendTelegramMessage("12345", "Test message");
    expect(sendRes).toBe(false);

    const editRes = await actualClient.editTelegramMessage("12345", 99, "Edited message");
    expect(editRes).toBe(false);

    const cbRes = await actualClient.answerTelegramCallback("cb_123");
    expect(cbRes).toBe(false);

    expect(warnSpy).toHaveBeenCalled();
  });
});
