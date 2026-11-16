import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as telegramWebhookPost } from "@/app/api/bot/telegram/route";
import { POST as paymentsWebhookPost } from "@/app/api/payments/webhook/route";
import { GET as chatMessagesGet, POST as chatMessagesPost } from "@/app/api/trips/[id]/messages/route";
import { POST as confirmTodayPost } from "@/app/api/trips/[id]/confirm-today/route";
import { completeTrips } from "@/lib/cron";
import { isRouteStopOrderValid } from "@/lib/trip-rules";
import { prisma } from "@/lib/prisma";
import * as auth from "@/lib/auth";

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    trip: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    booking: {
      findMany: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    driverProfile: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    $transaction: vi.fn(async (cb: unknown) => {
      if (typeof cb === "function") {
        return (cb as (tx: unknown) => Promise<unknown>)(mockPrisma);
      }
      if (Array.isArray(cb)) {
        return Promise.all(cb);
      }
      return [];
    }),
  };
  return { prisma: mockPrisma };
});

describe("telegram webhook route authorization", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = { ...origEnv };
  });

  afterEach(() => {
    process.env = origEnv;
  });

  it("fails closed (401) in production when TELEGRAM_WEBHOOK_SECRET is not set", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    delete process.env.TELEGRAM_WEBHOOK_SECRET;

    const request = new Request("http://localhost:3000/api/bot/telegram", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ update_id: 1 }),
    });

    const response = await telegramWebhookPost(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("fails (401) when secret token header does not match expected secret", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "secret_tg_123";

    const request = new Request("http://localhost:3000/api/bot/telegram", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-telegram-bot-api-secret-token": "wrong_secret",
      },
      body: JSON.stringify({ update_id: 1 }),
    });

    const response = await telegramWebhookPost(request);
    expect(response.status).toBe(401);
  });
});

describe("directional demand matching order verification", () => {
  const orderedStops = ["томск", "южная", "северск"];

  it("only matches demand if fromStop occurs before toStop in ordered stops", () => {
    // Direct forward direction
    expect(isRouteStopOrderValid(orderedStops, "Томск", "Северск")).toBe(true);
    expect(isRouteStopOrderValid(orderedStops, "Южная", "Северск")).toBe(true);
    expect(isRouteStopOrderValid(orderedStops, "Томск", "Южная")).toBe(true);

    // Opposite reverse direction must NOT match
    expect(isRouteStopOrderValid(orderedStops, "Северск", "Томск")).toBe(false);
    expect(isRouteStopOrderValid(orderedStops, "Северск", "Южная")).toBe(false);
    expect(isRouteStopOrderValid(orderedStops, "Южная", "Томск")).toBe(false);

    // Same stop must NOT match
    expect(isRouteStopOrderValid(orderedStops, "Томск", "Томск")).toBe(false);

    // Unknown stop must NOT match
    expect(isRouteStopOrderValid(orderedStops, "Асино", "Томск")).toBe(false);
    expect(isRouteStopOrderValid(orderedStops, "Томск", "Колпашево")).toBe(false);

    // Empty or whitespace inputs must NOT match
    expect(isRouteStopOrderValid(orderedStops, " ", "Северск")).toBe(false);
  });
});

describe("payments webhook rate limiting", () => {
  it("returns HTTP 429 when IP rate limit is exceeded", async () => {
    const testIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    let lastResponse: Response | null = null;

    // Send 61 requests from the same test IP
    for (let i = 0; i < 61; i++) {
      const request = new Request("http://localhost:3000/api/payments/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": testIp,
        },
        body: JSON.stringify({ event: "payment.succeeded" }),
      });
      lastResponse = await paymentsWebhookPost(request);
    }

    expect(lastResponse).not.toBeNull();
    expect(lastResponse?.status).toBe(429);
    const body = await lastResponse?.json();
    expect(body.error).toBe("Too Many Requests");
  });
});

describe("trips chat authorization", () => {
  it("GET returns 401 AUTH_REQUIRED when user is not logged in", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/trips/trip1/messages");
    const response = await chatMessagesGet(request, {
      params: Promise.resolve({ id: "trip1" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("POST returns 401 AUTH_REQUIRED when user is not logged in", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/trips/trip1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Привет" }),
    });
    const response = await chatMessagesPost(request, {
      params: Promise.resolve({ id: "trip1" }),
    });

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error.code).toBe("AUTH_REQUIRED");
  });

  it("GET returns 403 FORBIDDEN when user is not a participant", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({
      id: "outsider-user-id",
      login: "outsider",
      firstName: "Иван",
      role: "PASSENGER",
      status: "ACTIVE",
    });

    const tripMock = {
      id: "trip1",
      driverId: "driver-id",
      originName: "Томск",
      destName: "Северск",
      originLat: 56.5,
      originLng: 84.9,
      destLat: 56.6,
      destLng: 84.8,
      price: 100,
      seatsTotal: 3,
      comment: null,
      routeTemplate: null,
      bookings: [
        { passengerId: "passenger-1" },
        { passengerId: "passenger-2" },
      ],
    };

    (prisma.trip as unknown as { findUnique: unknown }).findUnique = vi
      .fn()
      .mockResolvedValue(tripMock);

    const request = new Request("http://localhost:3000/api/trips/trip1/messages");
    const response = await chatMessagesGet(request, {
      params: Promise.resolve({ id: "trip1" }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("Ты не участник этой поездки");
  });

  it("POST returns 403 FORBIDDEN when user is not a participant", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({
      id: "outsider-user-id",
      login: "outsider",
      firstName: "Иван",
      role: "PASSENGER",
      status: "ACTIVE",
    });

    const tripMock = {
      id: "trip1",
      departureTime: new Date(),
      driverId: "driver-id",
      originName: "Томск",
      destName: "Северск",
      originLat: 56.5,
      originLng: 84.9,
      destLat: 56.6,
      destLng: 84.8,
      price: 100,
      seatsTotal: 3,
      comment: null,
      routeTemplate: null,
      bookings: [
        { passengerId: "passenger-1" },
      ],
    };

    (prisma.trip as unknown as { findUnique: unknown }).findUnique = vi
      .fn()
      .mockResolvedValue(tripMock);

    const request = new Request("http://localhost:3000/api/trips/trip1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Привет" }),
    });
    const response = await chatMessagesPost(request, {
      params: Promise.resolve({ id: "trip1" }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("Ты не участник этой поездки");
  });
});

describe("confirm today route template driver check", () => {
  it("allows confirmation when user is driver of routeTemplate", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({
      id: "template-driver-id",
      login: "driver",
      firstName: "Водитель",
      role: "DRIVER",
      status: "ACTIVE",
    });

    const mockTrip = {
      id: "trip-series-1",
      status: "SCHEDULED",
      driverId: null,
      originName: null,
      destName: null,
      originLat: null,
      originLng: null,
      destLat: null,
      destLng: null,
      price: null,
      seatsTotal: null,
      comment: null,
      routeTemplate: {
        driverId: "template-driver-id",
        price: 150,
        seats: 3,
        notes: null,
        origin: { name: "Томск", lat: 56.5, lng: 84.9 },
        destination: { name: "Северск", lat: 56.6, lng: 84.8 },
      },
    };

    (prisma.trip as unknown as { findUnique: unknown; updateMany: unknown }).findUnique = vi
      .fn()
      .mockResolvedValue(mockTrip);
    (prisma.trip as unknown as { updateMany: unknown }).updateMany = vi
      .fn()
      .mockResolvedValue({ count: 1 });

    const request = new Request("http://localhost:3000/api/trips/trip-series-1/confirm-today", {
      method: "POST",
    });
    const response = await confirmTodayPost(request, {
      params: Promise.resolve({ id: "trip-series-1" }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.confirmed).toBe(true);
  });

  it("rejects confirmation when user is not driver of routeTemplate", async () => {
    vi.spyOn(auth, "getSessionUser").mockResolvedValue({
      id: "stranger-id",
      login: "stranger",
      firstName: "Чужой",
      role: "PASSENGER",
      status: "ACTIVE",
    });

    const mockTrip = {
      id: "trip-series-1",
      status: "SCHEDULED",
      driverId: null,
      originName: null,
      destName: null,
      originLat: null,
      originLng: null,
      destLat: null,
      destLng: null,
      price: null,
      seatsTotal: null,
      comment: null,
      routeTemplate: {
        driverId: "template-driver-id",
        price: 150,
        seats: 3,
        notes: null,
        origin: { name: "Томск", lat: 56.5, lng: 84.9 },
        destination: { name: "Северск", lat: 56.6, lng: 84.8 },
      },
    };

    (prisma.trip as unknown as { findUnique: unknown }).findUnique = vi
      .fn()
      .mockResolvedValue(mockTrip);

    const request = new Request("http://localhost:3000/api/trips/trip-series-1/confirm-today", {
      method: "POST",
    });
    const response = await confirmTodayPost(request, {
      params: Promise.resolve({ id: "trip-series-1" }),
    });

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("FORBIDDEN");
    expect(body.error.message).toBe("Это не твоя поездка");
  });
});

describe("cron completeTrips", () => {
  it("only marks CONFIRMED bookings as COMPLETED", async () => {
    const mockTrip = {
      id: "trip-1",
      status: "IN_PROGRESS",
      departureTime: new Date(Date.now() - 4 * 60 * 60 * 1000),
      driverId: "driver-1",
      originName: "Томск",
      destName: "Северск",
      originLat: 56.5,
      originLng: 84.9,
      destLat: 56.6,
      destLng: 84.8,
      price: 100,
      seatsTotal: 4,
      comment: null,
      routeTemplate: null,
    };

    vi.mocked(prisma.trip.findMany).mockResolvedValue([mockTrip as never]);
    vi.mocked(prisma.trip.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.booking.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.booking.findMany).mockResolvedValue([{ passengerId: "p1" } as never]);
    vi.mocked(prisma.driverProfile.updateMany).mockResolvedValue({ count: 1 });

    await completeTrips();

    expect(prisma.booking.updateMany).toHaveBeenCalledWith({
      where: { tripId: "trip-1", status: "CONFIRMED" },
      data: { status: "COMPLETED" },
    });
  });
});
