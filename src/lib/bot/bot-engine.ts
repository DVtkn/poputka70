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

export const POPULAR_HUBS = [
  "Площадь Ленина",
  "Лагерный сад",
  "Южные Ворота",
  "Аэропорт",
  "Ж/Д вокзал Томск-1",
  "Каштак",
  "Зелёные Горки",
  "Новособорная",
];

function getHubByIndex(idxStr: string): string | undefined {
  const i = parseInt(idxStr, 10);
  return Number.isInteger(i) && i >= 0 && i < POPULAR_HUBS.length ? POPULAR_HUBS[i] : undefined;
}

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

Выбери действие ниже или просто напиши в чат маршрут (например: <i>Лагерный сад в Аэропорт</i>):`;

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
    const query = text.replace(/^\/search\s*/i, "").trim();
    if (query) {
      const parsed = parseRouteText(query);
      if (parsed) {
        await executeAndSendSearchResults(chatId, parsed.from, parsed.to, "all");
        return;
      }
    }
    await sendOriginSelection(chatId);
    return;
  }

  if (text.startsWith("/recent")) {
    await sendRecentTrips(chatId);
    return;
  }

  // Смарт-парсинг свободного текста (например "Лагерный сад в Аэропорт" или "Каштак - ТГУ")
  const parsed = parseRouteText(text);
  if (parsed) {
    await executeAndSendSearchResults(chatId, parsed.from, parsed.to, "all");
    return;
  }

  // Если текст не распознан — предлагаем меню
  const reply = `Я пока не понял этот маршрут 🤔

Попробуй написать, например: <code>Лагерный сад в Аэропорт</code> или воспользуйся кнопками:`;

  await sendTelegramMessage(chatId, reply, {
    reply_markup: getMainMenuKeyboard(),
  });
}

export function parseRouteText(text: string): { from: string; to: string } | null {
  const trimmed = text.trim();
  // Убираем лишние предлоги в начале: "из", "от"
  const withoutLead = trimmed.replace(/^(?:из|от)\s+/i, "");

  // Разделители направлений: ->, —, –, -, а также союзы " в ", " до "
  const sepMatch = withoutLead.match(/^(.+?)\s*(?:->|—|–|-|\s+(?:в|до)\s+)\s*(.+)$/i);
  if (sepMatch) {
    const from = sepMatch[1].trim();
    const to = sepMatch[2].trim();
    if (from && to) return { from, to };
  }

  // Если явного разделителя нет — пробуем разбить по пробелам
  const parts = withoutLead.split(/\s+/).filter(Boolean);
  if (parts.length === 2) {
    return { from: parts[0], to: parts[1] };
  } else if (parts.length > 2) {
    return { from: parts[0], to: parts.slice(1).join(" ") };
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

  // Выбор пункта отправления
  if (data.startsWith("s:d:") || data.startsWith("s:dst:")) {
    const raw = data.startsWith("s:d:") ? data.slice(4) : data.slice(6);
    const origin = getHubByIndex(raw) || raw;
    const originIdx = POPULAR_HUBS.indexOf(origin);
    await sendDestSelection(chatId, messageId, origin, originIdx >= 0 ? originIdx : undefined);
    return;
  }

  // Выбор пункта назначения
  if (data.startsWith("s:t:") || data.startsWith("s:dt:")) {
    let origin: string | undefined;
    let dest: string | undefined;
    let originIdx: number | undefined;
    let destIdx: number | undefined;

    if (data.startsWith("s:t:")) {
      const parts = data.slice(4).split(":");
      origin = getHubByIndex(parts[0]);
      dest = getHubByIndex(parts[1]);
      originIdx = parseInt(parts[0], 10);
      destIdx = parseInt(parts[1], 10);
    } else {
      const parts = data.slice(5).split("|");
      origin = parts[0];
      dest = parts[1];
    }

    if (origin && dest) {
      await sendDateSelection(chatId, messageId, origin, dest, originIdx, destIdx);
    }
    return;
  }

  // Выбор даты и запуск поиска
  if (data.startsWith("s:x:") || data.startsWith("s:ex:")) {
    let dateCode: string | undefined;
    let from: string | undefined;
    let to: string | undefined;

    if (data.startsWith("s:x:")) {
      const parts = data.slice(4).split(":");
      dateCode = parts[0];
      from = getHubByIndex(parts[1]);
      to = getHubByIndex(parts[2]);
    } else {
      const parts = data.slice(5).split("|");
      dateCode = parts[0];
      from = parts[1];
      to = parts[2];
    }

    if (dateCode && from && to) {
      await executeAndSendSearchResults(chatId, from, to, dateCode);
    }
    return;
  }
}

async function sendOriginSelection(chatId: number, messageId?: number): Promise<void> {
  const text = `📍 <b>Шаг 1 из 3: Откуда едем?</b>

Выбери пункт отправления из списка или напиши текстом:`;

  const rows: TelegramInlineKeyboardMarkup["inline_keyboard"] = [];
  for (let i = 0; i < POPULAR_HUBS.length; i += 2) {
    const row = [{ text: POPULAR_HUBS[i], callback_data: `s:d:${i}` }];
    if (POPULAR_HUBS[i + 1]) {
      row.push({
        text: POPULAR_HUBS[i + 1],
        callback_data: `s:d:${i + 1}`,
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
  origin: string,
  originIdx?: number
): Promise<void> {
  const text = `📍 <b>Шаг 2 из 3: Куда едем?</b>
Маршрут: <b>${origin} → ?</b>

Выбери пункт назначения:`;

  const destinations = POPULAR_HUBS.map((name, idx) => ({ name, idx })).filter(
    (h) => h.name !== origin
  );
  const rows: TelegramInlineKeyboardMarkup["inline_keyboard"] = [];

  for (let i = 0; i < destinations.length; i += 2) {
    const row = [
      {
        text: destinations[i].name,
        callback_data:
          originIdx !== undefined
            ? `s:t:${originIdx}:${destinations[i].idx}`
            : `s:dt:${origin}|${destinations[i].name}`,
      },
    ];
    if (destinations[i + 1]) {
      row.push({
        text: destinations[i + 1].name,
        callback_data:
          originIdx !== undefined
            ? `s:t:${originIdx}:${destinations[i + 1].idx}`
            : `s:dt:${origin}|${destinations[i + 1].name}`,
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
  dest: string,
  originIdx?: number,
  destIdx?: number
): Promise<void> {
  const text = `📅 <b>Шаг 3 из 3: Когда едем?</b>
Маршрут: <b>${origin} → ${dest}</b>

Выбери дату отправления:`;

  const todayData =
    originIdx !== undefined && destIdx !== undefined
      ? `s:x:today:${originIdx}:${destIdx}`
      : `s:ex:today|${origin}|${dest}`;
  const tomorrowData =
    originIdx !== undefined && destIdx !== undefined
      ? `s:x:tomorrow:${originIdx}:${destIdx}`
      : `s:ex:tomorrow|${origin}|${dest}`;
  const allData =
    originIdx !== undefined && destIdx !== undefined
      ? `s:x:all:${originIdx}:${destIdx}`
      : `s:ex:all|${origin}|${dest}`;
  const backData =
    originIdx !== undefined ? `s:d:${originIdx}` : `s:dst:${origin}`;

  const keyboard: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: "Сегодня", callback_data: todayData }],
      [{ text: "Завтра", callback_data: tomorrowData }],
      [{ text: "Все ближайшие даты", callback_data: allData }],
      [{ text: "« Назад", callback_data: backData }],
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
