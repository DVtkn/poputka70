import { prisma } from "@/lib/prisma";
import { searchTrips, tripRoute, type TripSearchItem } from "@/lib/trips";
import { segmentLengthKm } from "@/lib/geo";
import { tomskTodayUtc, addDaysUtc, isoDateUtc } from "@/lib/time";
import { formatTripCardHtml } from "./formatters";
import {
  sendTelegramMessage,
  editTelegramMessage,
  answerTelegramCallback,
} from "./telegram-client";
import type {
  TelegramCallbackQuery,
  TelegramInlineKeyboardMarkup,
  TelegramMessage,
  TelegramUpdate,
} from "./types";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://poputka70.vercel.app";

const POPULAR_HUBS = [
  "Томск",
  "Северск",
  "Асино",
  "Аэропорт Богашёво",
  "Колпашево",
  "Межениновка",
];

function getMainMenuKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🔍 Найти поездку", callback_data: "s:org" }],
      [{ text: "🚗 Ближайшие рейсы", callback_data: "m:recent" }],
      [
        {
          text: "📱 Открыть Попутка70 (Mini App)",
          web_app: { url: APP_URL },
        },
      ],
      [{ text: "ℹ️ Как это работает", callback_data: "m:help" }],
    ],
  };
}

const WELCOME_TEXT = `🌲 <b>Добро пожаловать в Попутка70!</b>

Сервис совместных поездок по Томску и Томской области.
Без комиссий, скрытых платежей и переплат — оплата водителю напрямую.

Выбери действие ниже или просто напиши в чат маршрут (например: <i>Томск Асино</i>):`;

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
    return;
  }

  if (update.message?.text) {
    await handleTextMessage(update.message);
  }
}

async function handleTextMessage(message: TelegramMessage): Promise<void> {
  const chatId = message.chat.id;
  const text = message.text?.trim() || "";

  if (text.startsWith("/start") || text.startsWith("/help") || text.toLowerCase() === "меню") {
    await sendTelegramMessage(chatId, WELCOME_TEXT, {
      reply_markup: getMainMenuKeyboard(),
    });
    return;
  }

  if (text.startsWith("/search")) {
    await sendOriginSelection(chatId);
    return;
  }

  if (text.startsWith("/recent")) {
    await sendRecentTrips(chatId);
    return;
  }

  // Смарт-парсинг свободного текста (например "Томск Асино" или "из Северска в Томск")
  const parsed = parseRouteText(text);
  if (parsed) {
    await executeAndSendSearchResults(chatId, parsed.from, parsed.to, "all");
    return;
  }

  // Если текст не распознан — предлагаем меню
  const reply = `Я пока не понял этот маршрут 🤔

Попробуй написать, например: <code>Томск Асино</code> или воспользуйся кнопками:`;

  await sendTelegramMessage(chatId, reply, {
    reply_markup: getMainMenuKeyboard(),
  });
}

function parseRouteText(text: string): { from: string; to: string } | null {
  // Убираем лишние предлоги "из", "в", "до", "от"
  const cleaned = text
    .replace(/^(из|от)\s+/i, "")
    .replace(/\s+(в|до|->|—|-)\s+/i, " ")
    .trim();

  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const from = parts[0];
    const to = parts.slice(1).join(" ");
    return { from, to };
  }
  return null;
}

async function handleCallbackQuery(query: TelegramCallbackQuery): Promise<void> {
  const data = query.data || "";
  const chatId = query.message?.chat.id;
  const messageId = query.message?.message_id;

  await answerTelegramCallback(query.id);

  if (!chatId || !messageId) return;

  if (data === "m:main") {
    await editTelegramMessage(chatId, messageId, WELCOME_TEXT, {
      reply_markup: getMainMenuKeyboard(),
    });
    return;
  }

  if (data === "m:help") {
    const helpText = `ℹ️ <b>О сервисе Попутка70</b>

• <b>Бесплатно:</b> платформа не берёт комиссию за бронирование.
• <b>Прямой расчёт:</b> пассажир отдаёт деньги водителю при посадке или переводом.
• <b>Удобные коридоры:</b> водитель может подобрать пассажира на любой промежуточной остановке маршрута.
• <b>Безопасность:</b> отзывы и проверка автомобилей водителей.

Вопросы и поддержка: @poputka70`;

    const keyboard: TelegramInlineKeyboardMarkup = {
      inline_keyboard: [
        [{ text: "🔍 Найти поездку", callback_data: "s:org" }],
        [{ text: "« Главное меню", callback_data: "m:main" }],
      ],
    };

    await editTelegramMessage(chatId, messageId, helpText, { reply_markup: keyboard });
    return;
  }

  if (data === "m:recent") {
    await sendRecentTrips(chatId);
    return;
  }

  if (data === "s:org") {
    await sendOriginSelection(chatId, messageId);
    return;
  }

  if (data.startsWith("s:dst:")) {
    const origin = data.replace("s:dst:", "");
    await sendDestSelection(chatId, messageId, origin);
    return;
  }

  if (data.startsWith("s:dt:")) {
    const parts = data.replace("s:dt:", "").split("|");
    if (parts.length === 2) {
      await sendDateSelection(chatId, messageId, parts[0], parts[1]);
    }
    return;
  }

  if (data.startsWith("s:ex:")) {
    const parts = data.replace("s:ex:", "").split("|");
    if (parts.length === 3) {
      const [dateCode, from, to] = parts;
      await executeAndSendSearchResults(chatId, from, to, dateCode);
    }
  }
}

async function sendOriginSelection(chatId: number, messageId?: number): Promise<void> {
  const text = `📍 <b>Шаг 1 из 3: Откуда едем?</b>

Выбери пункт отправления из списка или напиши текстом:`;

  const rows: TelegramInlineKeyboardMarkup["inline_keyboard"] = [];
  for (let i = 0; i < POPULAR_HUBS.length; i += 2) {
    const row = [{ text: POPULAR_HUBS[i], callback_data: `s:dst:${POPULAR_HUBS[i]}` }];
    if (POPULAR_HUBS[i + 1]) {
      row.push({
        text: POPULAR_HUBS[i + 1],
        callback_data: `s:dst:${POPULAR_HUBS[i + 1]}`,
      });
    }
    rows.push(row);
  }
  rows.push([{ text: "« Главное меню", callback_data: "m:main" }]);

  const keyboard: TelegramInlineKeyboardMarkup = { inline_keyboard: rows };

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, { reply_markup: keyboard });
  } else {
    await sendTelegramMessage(chatId, text, { reply_markup: keyboard });
  }
}

async function sendDestSelection(
  chatId: number,
  messageId: number,
  origin: string
): Promise<void> {
  const text = `📍 <b>Шаг 2 из 3: Куда едем?</b>
Маршрут: <b>${origin} → ?</b>

Выбери пункт назначения:`;

  const destinations = POPULAR_HUBS.filter((h) => h !== origin);
  const rows: TelegramInlineKeyboardMarkup["inline_keyboard"] = [];

  for (let i = 0; i < destinations.length; i += 2) {
    const row = [
      {
        text: destinations[i],
        callback_data: `s:dt:${origin}|${destinations[i]}`,
      },
    ];
    if (destinations[i + 1]) {
      row.push({
        text: destinations[i + 1],
        callback_data: `s:dt:${origin}|${destinations[i + 1]}`,
      });
    }
    rows.push(row);
  }
  rows.push([{ text: "« Назад (к пункту отправления)", callback_data: "s:org" }]);

  await editTelegramMessage(chatId, messageId, text, {
    reply_markup: { inline_keyboard: rows },
  });
}

async function sendDateSelection(
  chatId: number,
  messageId: number,
  origin: string,
  dest: string
): Promise<void> {
  const text = `📅 <b>Шаг 3 из 3: Когда едем?</b>
Маршрут: <b>${origin} → ${dest}</b>

Выбери дату отправления:`;

  const keyboard: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: "Сегодня", callback_data: `s:ex:today|${origin}|${dest}` }],
      [{ text: "Завтра", callback_data: `s:ex:tomorrow|${origin}|${dest}` }],
      [{ text: "Все ближайшие даты", callback_data: `s:ex:all|${origin}|${dest}` }],
      [{ text: "« Назад", callback_data: `s:dst:${origin}` }],
    ],
  };

  await editTelegramMessage(chatId, messageId, text, { reply_markup: keyboard });
}

async function executeAndSendSearchResults(
  chatId: number,
  from: string,
  to: string,
  dateCode: string
): Promise<void> {
  const now = new Date();
  let dateQuery: string | undefined;

  if (dateCode === "today") {
    dateQuery = isoDateUtc(tomskTodayUtc(now));
  } else if (dateCode === "tomorrow") {
    dateQuery = isoDateUtc(addDaysUtc(tomskTodayUtc(now), 1));
  }

  await sendTelegramMessage(
    chatId,
    `⏳ Ищу доступные поездки <b>${from} → ${to}</b>…`
  );

  try {
    const results = await searchTrips({
      from,
      to,
      date: dateQuery,
      passengers: 1,
      limit: 5,
      now,
    });

    if (results.length === 0) {
      const searchUrl = `${APP_URL}/search?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
      const emptyText = `😔 Поездок по маршруту <b>${from} → ${to}</b> на выбранную дату пока не найдено.

Ты можешь открыть поиск на сайте — возможно, есть рейсы с других остановок или на другие даты:`;

      await sendTelegramMessage(chatId, emptyText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "📱 Открыть поиск на сайте", web_app: { url: searchUrl } }],
            [{ text: "🔍 Другой маршрут", callback_data: "s:org" }],
            [{ text: "🏠 Главное меню", callback_data: "m:main" }],
          ],
        },
      });
      return;
    }

    const header = `🎉 Найдено поездок: <b>${results.length}</b>\nМаршрут: <b>${from} → ${to}</b>:`;
    await sendTelegramMessage(chatId, header);

    for (const trip of results) {
      const { text, tripUrl } = formatTripCardHtml(trip, APP_URL);
      await sendTelegramMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Забронировать место",
                web_app: { url: tripUrl },
              },
            ],
          ],
        },
      });
    }

    // Меню после результатов
    await sendTelegramMessage(chatId, "Что делаем дальше?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔍 Новый поиск", callback_data: "s:org" }],
          [{ text: "🏠 Главное меню", callback_data: "m:main" }],
        ],
      },
    });
  } catch (error) {
    console.error("[TelegramBot] search error:", error);
    await sendTelegramMessage(
      chatId,
      "Произошла ошибка при поиске поездок. Пожалуйста, попробуй позже."
    );
  }
}

async function sendRecentTrips(chatId: number): Promise<void> {
  const now = new Date();
  const today = tomskTodayUtc(now);

  try {
    const trips = await prisma.trip.findMany({
      where: {
        date: { gte: today },
        status: { in: ["CONFIRMED", "SCHEDULED"] },
        departureTime: { gt: now },
        availableSeats: { gt: 0 },
      },
      include: {
        routeTemplate: {
          select: {
            driverId: true,
            price: true,
            seats: true,
            notes: true,
            origin: { select: { name: true, lat: true, lng: true } },
            destination: { select: { name: true, lat: true, lng: true } },
          },
        },
        driver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            ratingAsDriver: true,
            maxVerifiedAt: true,
            driverProfile: { select: { carModel: true, carColor: true } },
          },
        },
      },
      orderBy: { departureTime: "asc" },
      take: 4,
    });

    if (trips.length === 0) {
      await sendTelegramMessage(
        chatId,
        "На ближайшее время запланированных поездок пока нет. Загляни чуть позже!",
        { reply_markup: getMainMenuKeyboard() }
      );
      return;
    }

    await sendTelegramMessage(chatId, "🚗 <b>Ближайшие опубликованные поездки:</b>");

    for (const trip of trips) {
      const route = tripRoute(trip);
      if (!route || !trip.driver) continue;

      const item: TripSearchItem = {
        id: trip.id,
        date: trip.date,
        departureTime: trip.departureTime,
        originName: route.originName,
        destName: route.destName,
        priceFull: route.price,
        legPrice: route.price,
        legKm: Math.round(segmentLengthKm(route.origin, route.dest) * 10) / 10,
        seatsLeft: trip.availableSeats,
        seatsTotal: route.seatsTotal,
        comment: trip.comment,
        driver: {
          id: trip.driver.id,
          firstName: trip.driver.firstName,
          lastName: trip.driver.lastName,
          ratingAsDriver: trip.driver.ratingAsDriver,
          verified: Boolean(trip.driver.maxVerifiedAt),
          carModel: trip.driver.driverProfile?.carModel ?? null,
          carColor: trip.driver.driverProfile?.carColor ?? null,
        },
      };

      const { text, tripUrl } = formatTripCardHtml(item, APP_URL);
      await sendTelegramMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📱 Забронировать место",
                web_app: { url: tripUrl },
              },
            ],
          ],
        },
      });
    }

    await sendTelegramMessage(chatId, "Нужен другой маршрут?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🔍 Найти конкретную поездку", callback_data: "s:org" }],
          [{ text: "🏠 Главное меню", callback_data: "m:main" }],
        ],
      },
    });
  } catch (error) {
    console.error("[TelegramBot] recent trips error:", error);
    await sendTelegramMessage(
      chatId,
      "Не удалось загрузить поездки. Пожалуйста, попробуй позже."
    );
  }
}
