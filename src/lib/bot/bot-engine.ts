import { prisma } from "@/lib/prisma";
import { searchTrips, tripRoute, type TripSearchItem } from "@/lib/trips";
import { segmentLengthKm } from "@/lib/geo";
import { tomskTodayUtc, addDaysUtc, isoDateUtc } from "@/lib/time";
import { formatTripCardHtml, escapeHtml } from "./formatters";
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
      [
        {
          text: "🚀 Найти попутку (Mini App)",
          web_app: { url: `${APP_URL}/search` },
        },
      ],
      [
        {
          text: "🚗 Опубликовать поездку",
          web_app: { url: `${APP_URL}/driver` },
        },
      ],
      [{ text: "⚡️ Ближайшие рейсы", callback_data: "m:recent" }],
      [{ text: "ℹ️ О сервисе", callback_data: "m:help" }],
    ],
  };
}

const WELCOME_TEXT = `🌲 <b>Попутка70</b> — совместные поездки в Томске без комиссий.
💡 <b>Совет:</b> выбирай остановку <b>ближе к себе</b> — водители едут через город и заберут по пути.
Открывай Mini App с картой маршрутов и поиском по 768 остановкам:`;

const HELP_TEXT = `ℹ️ <b>О сервисе Попутка70</b>

• <b>Бесплатно:</b> без комиссий и сборов, расчёт с водителем напрямую.
• <b>По пути:</b> водители подбирают на остановках по коридору маршрута.
• <b>Проверено:</b> реальные оценки и верификация водителей.

💡 <b>Совет:</b> выбирай остановку ближе к себе — водители заберут по пути.

Поддержка: @poputka70`;

function getHelpKeyboard(): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [{ text: "🚀 Найти попутку (Mini App)", web_app: { url: `${APP_URL}/search` } }],
      [{ text: "🔍 Поиск в чате", callback_data: "s:org" }],
      [{ text: "🏠 Главное меню", callback_data: "m:main" }],
    ],
  };
}

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
  const lower = text.toLowerCase();

  if (
    text.startsWith("/help") ||
    lower === "помощь" ||
    lower === "о сервисе" ||
    lower === "поддержка"
  ) {
    await sendTelegramMessage(chatId, HELP_TEXT, {
      reply_markup: getHelpKeyboard(),
    });
    return;
  }

  if (
    text.startsWith("/start") ||
    text.startsWith("/menu") ||
    lower === "меню" ||
    lower === "старт" ||
    lower === "привет" ||
    lower === "здравствуйте" ||
    lower === "добрый день"
  ) {
    const startPayload = text.replace(/^\/start\s*/i, "").trim();

    if (startPayload.startsWith("trip_")) {
      const tripId = startPayload.replace(/^trip_/, "");

      try {
        const trip = await prisma.trip.findUnique({
          where: { id: tripId },
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
        });

        if (trip && trip.driver) {
          const route = tripRoute(trip);
          if (route) {
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
                ratingAsDriver: trip.driver.ratingAsDriver ?? 5,
                verified: Boolean(trip.driver.maxVerifiedAt),
                carModel: trip.driver.driverProfile?.carModel ?? null,
                carColor: trip.driver.driverProfile?.carColor ?? null,
              },
            };
            const { text: cardText, tripUrl } = formatTripCardHtml(item, APP_URL);
            await sendTelegramMessage(chatId, `🚗 <b>Поездка найдена!</b>\n\n${cardText}`, {
              reply_markup: {
                inline_keyboard: [
                  [{ text: "⚡️ Забронировать", web_app: { url: tripUrl } }],
                  [{ text: "🏠 Главное меню", callback_data: "m:main" }],
                ],
              },
            });
            return;
          }
        }
      } catch (err) {
        console.error("[TelegramBot] deep link trip lookup error:", err);
      }

      const safeTripId = escapeHtml(tripId);
      await sendTelegramMessage(chatId, `🚗 <b>Поездка #${safeTripId}</b>\n\nОткрой бронирование в Mini App:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "⚡️ Забронировать", web_app: { url: `${APP_URL}/trips/${encodeURIComponent(tripId)}` } }],
            [{ text: "🏠 Главное меню", callback_data: "m:main" }],
          ],
        },
      });
      return;
    }

    if (startPayload === "search") {
      await sendOriginSelection(chatId);
      return;
    }

    if (startPayload === "driver") {
      await sendTelegramMessage(chatId, `🚗 <b>Публикация поездки</b>\n\nУкажи маршрут, время и свободные места в Mini App:`, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚗 Опубликовать поездку", web_app: { url: `${APP_URL}/driver` } }],
            [{ text: "🏠 Главное меню", callback_data: "m:main" }],
          ],
        },
      });
      return;
    }

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

  // Если пользователь написал известную остановку/хаб (например "Лагерный сад" или "Южные Ворота")
  const matchedHub = POPULAR_HUBS.find((h) => h.toLowerCase() === text.toLowerCase());
  if (matchedHub) {
    const hubIdx = POPULAR_HUBS.indexOf(matchedHub);
    await sendDestSelection(chatId, undefined, matchedHub, hubIdx >= 0 ? hubIdx : undefined);
    return;
  }

  // Смарт-парсинг свободного текста (например "Лагерный сад в Аэропорт" или "Каштак - ТГУ")
  const parsed = parseRouteText(text);
  if (parsed) {
    await executeAndSendSearchResults(chatId, parsed.from, parsed.to, "all");
    return;
  }

  // Если текст не распознан — предлагаем меню
  const reply = `Не удалось распознать маршрут 🤔

Напиши, например: <code>Лагерный сад в Аэропорт</code> или воспользуйся поиском:`;

  await sendTelegramMessage(chatId, reply, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🚀 Найти попутку (Mini App)", web_app: { url: `${APP_URL}/search` } }],
        [{ text: "🔍 Выбрать из списка", callback_data: "s:org" }],
        [{ text: "🏠 Главное меню", callback_data: "m:main" }],
      ],
    },
  });
}

const ROUTE_STOP_WORDS = new Set([
  "привет",
  "здравствуйте",
  "добрый",
  "день",
  "вечер",
  "утро",
  "хай",
  "помощь",
  "как",
  "где",
  "куда",
  "откуда",
  "когда",
  "кто",
  "что",
  "зачем",
  "почему",
  "сколько",
  "спасибо",
  "пожалуйста",
  "меню",
  "старт",
]);

export function parseRouteText(text: string): { from: string; to: string } | null {
  const trimmed = text.trim();
  // Убираем лишние предлоги в начале: "из", "от"
  const withoutLead = trimmed.replace(/^(?:из|от)\s+/i, "");

  // 1. Разделители направлений:
  // - стрелки: ->, -->, =>
  // - тире/дефис с пробелами: " - ", " — ", " – " или длинные тире "—", "–"
  // - предлоги направления: " в ", " до ", " на "
  // - запятая
  const sepMatch = withoutLead.match(
    /^(.+?)\s*(?:->|-->|=>|(?<=\s)[-—–](?=\s)|[—–]|\s+(?:в|до|на)\s+|,)\s*(.+)$/i
  );
  if (sepMatch) {
    const from = sepMatch[1].trim();
    const to = sepMatch[2].trim();
    if (from && to && from.toLowerCase() !== to.toLowerCase()) {
      return { from, to };
    }
  }

  // 2. Если весь ввод совпадает с названием популярного хаба — это не маршрут из двух точек
  const isSingleHub = POPULAR_HUBS.some((h) => h.toLowerCase() === withoutLead.toLowerCase());
  if (isSingleHub) return null;

  // 3. Ровно два слова, если ни одно из них не является стоп-словом (например "Томск Асино")
  const parts = withoutLead.split(/\s+/).filter(Boolean);
  if (parts.length === 2) {
    const w0 = parts[0].toLowerCase();
    const w1 = parts[1].toLowerCase();
    if (!ROUTE_STOP_WORDS.has(w0) && !ROUTE_STOP_WORDS.has(w1)) {
      return { from: parts[0], to: parts[1] };
    }
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
    await editTelegramMessage(chatId, messageId, HELP_TEXT, { reply_markup: getHelpKeyboard() });
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
  const text = `📍 <b>Откуда едем?</b>

💡 <i>Совет: выбирай остановку ближе к себе — водители заберут по пути.</i>

Выбери хаб или открой интерактивную карту:`;

  const rows: TelegramInlineKeyboardMarkup["inline_keyboard"] = [
    [
      {
        text: "🗺 Открыть поиск в Mini App",
        web_app: { url: `${APP_URL}/search` },
      },
    ],
  ];
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
  messageId: number | undefined,
  origin: string,
  originIdx?: number
): Promise<void> {
  const text = `📍 <b>Куда едем?</b>
Маршрут: <b>${escapeHtml(origin)} → ?</b>

💡 <i>Укажи ближайшую к цели остановку.</i>`;

  const safeOriginIdx =
    originIdx !== undefined ? originIdx : POPULAR_HUBS.indexOf(origin);

  const destinations = POPULAR_HUBS.map((name, idx) => ({ name, idx })).filter(
    (h) => h.name !== origin
  );
  const searchFromUrl = `${APP_URL}/search?from=${encodeURIComponent(origin)}`;
  const rows: TelegramInlineKeyboardMarkup["inline_keyboard"] = [
    [
      {
        text: "🗺 Продолжить в Mini App",
        web_app: { url: searchFromUrl },
      },
    ],
  ];

  for (let i = 0; i < destinations.length; i += 2) {
    const row = [
      safeOriginIdx >= 0
        ? {
            text: destinations[i].name,
            callback_data: `s:t:${safeOriginIdx}:${destinations[i].idx}`,
          }
        : {
            text: destinations[i].name,
            web_app: {
              url: `${APP_URL}/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destinations[i].name)}`,
            },
          },
    ];
    if (destinations[i + 1]) {
      row.push(
        safeOriginIdx >= 0
          ? {
              text: destinations[i + 1].name,
              callback_data: `s:t:${safeOriginIdx}:${destinations[i + 1].idx}`,
            }
          : {
              text: destinations[i + 1].name,
              web_app: {
                url: `${APP_URL}/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(destinations[i + 1].name)}`,
              },
            }
      );
    }
    rows.push(row);
  }
  rows.push([{ text: "« Назад к выбору отправления", callback_data: "s:org" }]);

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, {
      reply_markup: { inline_keyboard: rows },
    });
  } else {
    await sendTelegramMessage(chatId, text, {
      reply_markup: { inline_keyboard: rows },
    });
  }
}

async function sendDateSelection(
  chatId: number,
  messageId: number | undefined,
  origin: string,
  dest: string,
  originIdx?: number,
  destIdx?: number
): Promise<void> {
  const text = `📅 <b>Когда едем?</b>
Маршрут: <b>${escapeHtml(origin)} → ${escapeHtml(dest)}</b>`;

  const safeOriginIdx =
    originIdx !== undefined ? originIdx : POPULAR_HUBS.indexOf(origin);
  const safeDestIdx =
    destIdx !== undefined ? destIdx : POPULAR_HUBS.indexOf(dest);

  const isHubRoute = safeOriginIdx >= 0 && safeDestIdx >= 0;

  const todayData = isHubRoute
    ? `s:x:today:${safeOriginIdx}:${safeDestIdx}`
    : "s:org";
  const tomorrowData = isHubRoute
    ? `s:x:tomorrow:${safeOriginIdx}:${safeDestIdx}`
    : "s:org";
  const allData = isHubRoute
    ? `s:x:all:${safeOriginIdx}:${safeDestIdx}`
    : "s:org";
  const backData = safeOriginIdx >= 0 ? `s:d:${safeOriginIdx}` : "s:org";

  const searchUrl = `${APP_URL}/search?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(dest)}`;

  const keyboard: TelegramInlineKeyboardMarkup = {
    inline_keyboard: [
      [{ text: "🗺 Открыть маршрут в Mini App", web_app: { url: searchUrl } }],
      [
        { text: "Сегодня", callback_data: todayData },
        { text: "Завтра", callback_data: tomorrowData },
      ],
      [{ text: "Все даты", callback_data: allData }],
      [{ text: "« Назад к выбору назначения", callback_data: backData }],
    ],
  };

  if (messageId) {
    await editTelegramMessage(chatId, messageId, text, { reply_markup: keyboard });
  } else {
    await sendTelegramMessage(chatId, text, { reply_markup: keyboard });
  }
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

  const searchUrlParams = new URLSearchParams({ from, to });
  if (dateQuery) {
    searchUrlParams.set("date", dateQuery);
  }
  const searchUrl = `${APP_URL}/search?${searchUrlParams.toString()}`;

  await sendTelegramMessage(
    chatId,
    `⏳ Ищу доступные поездки <b>${escapeHtml(from)} → ${escapeHtml(to)}</b>…`
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
      const emptyText = `😔 Поездок <b>${escapeHtml(from)} → ${escapeHtml(to)}</b> на эту дату пока нет.

💡 <b>Совет:</b> водители подбирают по пути — выбери соседнюю остановку или открой поиск на карте:`;

      await sendTelegramMessage(chatId, emptyText, {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🗺 Открыть маршрут в Mini App", web_app: { url: searchUrl } }],
            [{ text: "🔍 Другой маршрут", callback_data: "s:org" }],
            [{ text: "🏠 Главное меню", callback_data: "m:main" }],
          ],
        },
      });
      return;
    }

    const header = `🎉 Найдено поездок: <b>${results.length}</b> (${escapeHtml(from)} → ${escapeHtml(to)}):`;
    await sendTelegramMessage(chatId, header);

    for (const trip of results) {
      const { text, tripUrl } = formatTripCardHtml(trip, APP_URL);
      await sendTelegramMessage(chatId, text, {
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "⚡️ Забронировать",
                web_app: { url: tripUrl },
              },
            ],
          ],
        },
      });
    }

    // Меню после результатов
    await sendTelegramMessage(chatId, "Что дальше?", {
      reply_markup: {
        inline_keyboard: [
          [{ text: "🗺 Все варианты на карте (Mini App)", web_app: { url: searchUrl } }],
          [{ text: "🔍 Новый поиск", callback_data: "s:org" }],
          [{ text: "🏠 Главное меню", callback_data: "m:main" }],
        ],
      },
    });
  } catch (error) {
    console.error("[TelegramBot] search error:", error);
    await sendTelegramMessage(
      chatId,
      "Не удалось выполнить поиск. Попробуй позже или открой Mini App.",
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: "🚀 Открыть Mini App", web_app: { url: searchUrl } }],
            [{ text: "🏠 Главное меню", callback_data: "m:main" }],
          ],
        },
      }
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
        "На ближайшее время поездок пока нет. Опубликуй свою или загляни чуть позже!",
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🚗 Опубликовать поездку", web_app: { url: `${APP_URL}/driver` } }],
              [{ text: "🏠 Главное меню", callback_data: "m:main" }],
            ],
          },
        }
      );
      return;
    }

    await sendTelegramMessage(chatId, "🚗 <b>Ближайшие поездки по Томску:</b>");

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
                text: "⚡️ Забронировать",
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
          [{ text: "🚀 Найти попутку (Mini App)", web_app: { url: `${APP_URL}/search` } }],
          [{ text: "🔍 Поиск в чате", callback_data: "s:org" }],
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
