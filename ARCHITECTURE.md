# Архитектура Попутка70 (подетально)

Документ для инженеров и агента: как устроена система, где что лежит, какие контракты и инварианты, как деплоить и расширять. Соответствует коду на 16.11.2026 (готовность к массовому запуску).

## 1. Стек и платформа

| Слой | Технология | Замечания |
|---|---|---|
| Фронтенд | Next.js 16 (App Router, RSC + клиентские компоненты), React 19, Tailwind CSS | шрифты Unbounded/Golos Text/JetBrains Mono |
| Telegram Mini App | Telegram WebApp SDK, Bot API 8.0, safe area CSS vars, deep linking | запуск в 1 тап из Telegram, haptic feedback |
| API | Route Handlers Next.js (`src/app/api/**`) | единый конверт ответов, zod-валидация |
| Telegram Bot | Webhook handler (`/api/bot/telegram`), Bot API 8.0 client | интерактивные уведомления с inline-кнопками, поиск |
| БД | PostgreSQL (Neon), Prisma 7 + `@prisma/adapter-pg` | TCP 5432 локально закрыт → миграции через Neon HTTP |
| Сессии | JWT (jose) в httpOnly-cookie + Telegram `initData` HMAC | мгновенный вход в TMA без ввода паролей |
| Чат и отзывы | Внутренний чат поездки (`ChatMessage`), двусторонние отзывы (`Review`) | координация встречи + взаимный рейтинг водитель/пассажир |
| Push | Web Push (VAPID) + интерактивные уведомления Telegram-бота | дублирование событий в бот и браузер |
| Cron | Vercel Cron (суточный) + GitHub Actions (15 мин) | секрет `CRON_SECRET` (Bearer) |
| Хостинг | Vercel (Hobby), домен poputka70.vercel.app | откат — Instant Rollback |
| CI | GitHub Actions: typecheck → lint → vitest → build | секреты не требуются (сборка без БД деградирует) |

## 2. Карта репозитория

```
src/
  app/                     # страницы и API (App Router)
    page.tsx               # лендинг (статистика из БД, поиск, спрос)
    search/                # поиск по остановкам и коридору
    routes/[id]/           # маршрут водителя + список рейсов
    trips/[id]/            # рейс + бронирование + чат поездки
    profile/{,bookings,trips,verify,edit}/ # кабинет пользователя/водителя
    driver/                # регистрация автомобиля, статус водителя
    notifications/         # уведомления + подписка на push
    admin/verifications/   # модерация документов
    users/[id]/            # публичный профиль и двусторонние отзывы
    login/, register/      # модалки и страницы входа
    onboarding/            # приветствие без фиксации роли
    legal/, how-it-works/  # юридика и справка
    bot-design/            # превью Telegram-визуалов
    api/                   # все эндпоинты (см. §5)
      bot/telegram/        # Webhook Telegram-бота (диалог, поиск, callbacks)
      auth/telegram/       # авторизация через Telegram initData и widget
    layout.tsx             # метаданные, safe area, TelegramInit, SW
    opengraph-image.tsx    # генерация OG-картинки (next/og)
  components/              # UI-компоненты
    TelegramInit.tsx       # интеграция TMA (Bot API 8.0, safe-area, haptic)
    TripShareButton.tsx    # кнопка шеринга в Telegram и соцсети
    TripChat.tsx           # чат поездки для координации
    StopCombobox.tsx       # поиск остановок с GPS-локатором
    RouteMap.tsx           # Яндекс.Карты (static-maps)
    ui/*                   # Card, Button, Modal, RatingDisplay...
  lib/
    auth.ts                # сессия: JWT + чтение пользователя из БД
    telegram-auth.ts       # HMAC-SHA256 валидация initData от Telegram
    bot/                   # движок Telegram-бота:
      telegram-client.ts   # Bot API 10.4 клиент (sendMessage, sendWidget, editMessageWidgetData, answerWidgetQuery)
      bot-engine.ts        # роутинг команд, текстовых запросов и widget_query
      booking-notifications.ts # интерактивные уведомления с inline-кнопками и расчет при финише
      formatters.ts        # форматирование сообщений (включая MessageEntity bank_card_number)
      widgets/             # изолированные микро-виджеты (<32KB, Bot API 10.4):
        seat-map-widget.ts # схема салона автомобиля и бронирование мест
        route-timeline-widget.ts # интерактивный таймлайн остановок коридора
    http.ts                # ok()/fail()/errors/parseBody/parseQuery (единый конверт)
    schemas.ts             # все zod-схемы входов
    rate-limit.ts          # in-memory лимитер (демпфер)
    bookings.ts            # жизненный цикл брони: отмена, 15-мин grace-period
    cron.ts                # задачи: генерация рейсов, напоминания, статусы, TTL
    pricing.ts             # тарифы, котировка отрезков
    trips.ts               # публикация поездки, снимок маршрута/цены
    route-registry.ts      # реестр маршрутов + координаты остановок
    push.ts/push-client.ts # Web Push (+ VAPID)
    time.ts                # Asia/Tomsk (UTC+7) утилиты
    prisma.ts              # PrismaClient + pg Pool
data/tomsk-stops.csv       # 768 остановок Томска
data/tomsk-route-registry.json # 34 эталонных маршрута
prisma/schema.prisma       # модель данных
prisma/migrations/**       # 13 миграций (Neon HTTP)
scripts/
  bot/setup-webhook.mjs    # автоматическая настройка бота, меню и брендинга
  db/apply-migrations-http.mjs  # применение миграций через Neon HTTP
  smoke-prod.mjs           # 13 шагов сквозного смоука на проде
  e2e-user-journey-test.mjs # 17 шагов сквозного E2E-тестирования
```

## 3. Рантайм: как течёт запрос

```
Браузер → Vercel Edge/CDN
  ├─ статика/страницы (RSC): server components читают Prisma напрямую
  ├─ клиентские компоненты: fetch → /api/** (конверт {success:true,...} / {success:false,error:{code,message}})
  └─ сервис-воркер: кэш только /_next/static, /icons, /manifest.json (API и страницы — сеть)

API Route Handler:
  parseBody/parseQuery (zod) → getSessionUser() (JWT + БД) → rate-limit → бизнес-логика (Prisma, CAS-транзакции)
  → ok()/fail() → JSON
```

Ключевые инварианты:
1. `Trip.availableSeats` — единственный источник правды о местах; меняется только условными `updateMany` в транзакции (`WHERE availableSeats > 0`), есть CHECK `>= 0`.
2. Одна активная бронь на (trip, passenger): частичный уникальный индекс `Booking_active_trip_passenger_key ... WHERE status IN ('PENDING','CONFIRMED')`.
3. Бронь живёт с дедлайном оплаты; истёк — система снимает и возвращает место ровно один раз (CAS).
4. Деньги: сервер — единственный источник цен (`routeTemplate.price/serviceFee`), клиент ничего не считает сам.
5. Время: всё хранится в UTC; календарные даты рейсов — UTC-полночь «даты Томска» (`tomskTodayUtc`), отображение — `timeZone: Asia/Tomsk`.

## 4. Модель данных (таблицы и связи)

- `User` (служебная роль, статус, рейтинги `ratingAsDriver`/`ratingAsPassenger`, `telegramId`, `telegramUsername`, `authProvider`, реферальный код, `bio`) 1—1 `DriverProfile`
- `Trip` (дата, отправление UTC, статус, места, `price`, `autoAccept`, `routeStops` JSONB, водитель) 1—N `Booking`, 1—N `ChatMessage`
- `Booking` (статус, сумма, отрезок `pickupStopId/dropoffStopId`, льготный дедлайн отмены, отмена) 1—N `Review` (взаимные)
- `ChatMessage` (поездка, отправитель, текст сообщения, время отправки)
- `Review` (оценка 1–5, текст, роль автора, уникальный индекс `(bookingId, reviewerId)`)
- `Stop` (справочник 768 остановок Томска с нормализованным поиском и координатами)
- `Notification`, `PushSubscription`, `DemandRequest`, `RouteTemplate`, `Complaint`
- `_prisma_migrations` (журнал миграций через Neon HTTP)

## 4.1 Концепция 2.2 и ключевые инварианты (ноябрь 2026)

- **Trip — самостоятельная сущность:** водитель, точки начала и конца, `price`, `availableSeats`, снимок `routeStops`, флаг `autoAccept` (мгновенное бронирование без ожидания подтверждения водителя).
- **Booking — заявка на отрезок:** статусы PENDING («ожидает решения водителя») или сразу CONFIRMED (при `autoAccept`). Бесплатная отмена: в течение 15 минут после создания (защита от случайных кликов) или за ≥60 минут до старта.
- **Внутренний чат (`ChatMessage`):** изолированный чат конкретной поездки, доступный только подтверждённым пассажирам и водителю.
- **Двусторонние отзывы (`Review`):** и водитель, и пассажир могут независимо оценить поездку после её завершения (COMPLETED). Рейтинги пересчитываются атомарно в транзакции.
- **Telegram-идентификация (`User.telegramId`):** бесшовная привязка аккаунта при открытии из Telegram Mini App без дополнительных форм входа.

## 5. API-каталог (сжатый)

Конверт: успех `{success:true, ...}`, ошибка `{success:false, error:{code,message,fieldErrors?}}`, коды: VALIDATION_ERROR, AUTH_REQUIRED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, PAYMENT_REQUIRED, INTERNAL.

| Группа | Эндпоинты |
|---|---|
| Auth | POST /api/auth/login, /register, /logout; GET /me; POST /api/auth/telegram (TMA & Widget) |
| Telegram Bot | POST /api/bot/telegram (Webhook Bot API 8.0 с HMAC verification) |
| Публичные | GET /api/health, GET /api/pricing/suggest, GET /api/routes |
| Поиск/справочник | GET /api/stops (автодополнение 768 остановок + ориентиры) |
| Поездки | GET /api/trips (лента / поиск по коридору), POST /api/trips (публикация), POST /api/trips/[id]/quote (цена отрезка), POST /api/trips/[id]/cancel |
| Чат поездки | GET /api/trips/[id]/chat, POST /api/trips/[id]/chat |
| Заявки | POST /api/bookings (запрос места / autoAccept), POST /api/bookings/[id]/accept / decline, POST /api/bookings/[id]/cancel |
| Пользователь | GET/POST /api/bookings, GET/PATCH /api/notifications, POST /api/demand-requests, POST /api/reviews, POST /api/push-subscriptions, GET/POST /api/referrals |
| Водитель | POST /api/driver/register, POST /api/driver/verify (права/авто), POST /api/routes |
| Админ | GET/PATCH /api/admin/verifications, GET /api/admin/verifications/[id]/photo |
| Cron | GET /api/cron/{generate-trips,send-reminders,confirmation-deadlines,start-trips,complete-trips,expire-unpaid,daily} (Bearer fail-closed) |

Лимиты (in-memory, на инстанс; честные ограничения — в LAUNCH.md): login 20/15мин на IP + 10/15мин на логин; register 5/час IP; bookings 20/час; payments 10/час; reviews 10/час; demand 5/сутки; pricing 30/мин IP.

## 6. Сессии и авторизация
- Вход/регистрация ставят cookie `session` (JWT HS256, `sub` = userId, 7 дней, httpOnly, secure, sameSite=lax).
- `getSessionUser()`: верифицирует токен → читает пользователя из БД (role/status/ref-код) → недоступен при `status !== ACTIVE`. Для производительности — короткий кэш сессии (5 c, до 1000 записей) с явной инвалидацией при смене роли; в токене нет PII.
- Проверки в эндпоинтах: `getSessionUser()` + точечные `isAdmin()`/владелец ресурса.

## 7. Платежи и вебхуки
- Создание: только своей активной брони, не в прошлом, не после дедлайна; идемпотентный ключ `booking-<id>`; повторный незавершённый платёж переиспользуется (запрос статуса).
- Вебхук: JSON → перезапрос платежа в ЮKassa (`getPayment`) → сверка суммы → атомарный перевод в PAID → уведомление. Отмена платежа — снятие неоплаченной брони с возвратом места. Любое неизвестное событие → 200 без эффектов (никаких ретраев-петель).
- Возврат: `refundPayment` с ключом `refund-<bookingId>`; статус REFUNDED только после успеха; без ключей — пометка «оформит поддержка».

## 8. Cron-архитектура
- Реализация одна: `src/lib/cron.ts` (чистые функции-джобы) + тонкие роуты (Bearer-секрет, fail-closed). Скрипты-дубли удалены.
- Идемпотентность: CAS-переходы, `createMany(skipDuplicates)`, батчи ≤200, «догон» вместо расписания-в-точку.
- Запуск: Vercel Cron (`/api/cron/daily`, 15:00 UTC = 22:00 Томска) + GitHub Actions каждые 15 минут (все задачи). Ручной запуск — `scripts/cron-call.mjs`.
- Все вычисления времени — UTC-инстанты; напоминания — окнами («сейчас..+2ч»).

## 9. Push-уведомления
- Подписка: баннер на `/notifications` → `pushManager.subscribe` (VAPID public из `/api/push-subscriptions` GET) → POST подписки (upsert по endpoint, чужой endpoint не перехватывается).
- Отправка: `sendNotificationToUsers` (батчи по 5, удаление подписок с 404/410). Иконки: `/icons/icon-192.png`, badge-72.
- Тексты формируются на сервере рядом с in-app уведомлениями (без эмодзи).

## 10. Валидация и ошибки
- Каждый вход (body/query) — zod-схема из `lib/schemas.ts`; ошибки — единый `VALIDATION_ERROR` с полями.
- Внутренние ошибки логируются, наружу — только `INTERNAL` (без `error.message`, имён таблиц и т.п.).

## 11. Производительность
- Пулы: один `pg.Pool` на инстанс (кэш в globalThis, max 5, SSL-проверка включена).
- Дистанции OSRM: кэш 24ч (1000 записей), таймаут 4 с, фолбэк — haversine×1.3; расчёт вынесен из транзакций.
- Страницы, читающие БД, динамические; лендинг — ISR 60с с деградацией (при недоступной БД статистика = нули, страница живёт).
- Поиск маршрутов: select-минимум, take 50/5, индексы под фильтры.

## 12. Инфраструктура, деплой, миграции
- Деплой: `npx vercel deploy --prod --scope=vtkn1 --yes` (или Preview-деплой для проверок). Откат: Instant Rollback в панели Vercel.
- Переменные: см. PRD приложение A. Секреты — только в Vercel/GitHub, не в репозитории.
- Миграции: `node --env-file=.env scripts/db/apply-migrations-http.mjs` (Neon HTTP; пишет журнал в `_prisma_migrations`). Порядок: миграция в `prisma/migrations/**` + правка `schema.prisma` + `npx prisma generate` + применение.
- Импорт остановок: `node --env-file=.env scripts/import-stops.mjs` (идемпотентно; источник `data/tomsk-stops.csv`).
- CI: GitHub Actions `CI` (typecheck/lint/test/build), `Cron` (15 мин, нужен секрет `CRON_SECRET`).

## 13. Безопасность (модель угроз)
| Угроза | Мера |
|---|---|
| Кража сессии | httpOnly+secure cookie, JWT без PII, ротация секрета инвалидирует всё |
| Бан/понижение роли не действуют | чтение пользователя из БД на каждый запрос |
| Перебор пароля | лимиты по IP и логину + рекомендация WAF-правила |
| Поддельный вебхук платежа | перезапрос платежа в API + сверка суммы; секреты не покидают сервер |
| Оверселлинг мест | условные updateMany + CHECK + частичный уникальный индекс |
| Локальный OSRM-спам | таймаут, кэш, лимит на публичный эндпоинт |
| Утечка PII | телефоны — только водителю после подтверждения; документы — только админу; нет хэшей в ответах |
| Секреты в git | `.env*` в .gitignore; `.vercelignore` не пускает .env в билд |

## 14. Тесты и качество
- vitest: pricing, time (UTC+7), схемы, лимитер, cron-секрет, парсер ошибок клиента (20 тестов и растёт).
- Линт и типы — обязательные гейты; PR-правило: без зелёного CI не мержить.
- Смоук на проде — `scripts/cron-call.mjs`, ручные чек-листы в LAUNCH.md.

## 15. Наблюдаемость
- `/api/health` (БД-проверка, 200/503) — внешний чек-монитор.
- Vercel-логи: ошибки API логируются с префиксом `[scope]`.
- P1: Sentry (или аналог) + алерты на 5xx и падение кронов.

## 16. Технический долг и точки расширения
1. `CityPoint` (15) → `Stop` (768): перевести маршруты/поиск на Stop, CityPoint вывести из обращения.
2. `Booking.seatsCount` (мультиместные брони) + миграция.
3. Коридорный матчинг (§7 PRD): полилинии OSRM, проекция остановок, ETA.
4. Приватный Vercel Blob под документы (PII вне БД).
5. `Message` (чат) и `Event` (аналитика).
6. Городской прайс-калкулятор на сегментах (после коридорного матчинга).
7. WAF rate limiting, Sentry, Playwright e2e.


## 10. Роли и регистрация (обновление 17.10.2026)

**Выбор роли при регистрации удалён.** Форма не спрашивает «пассажир или водитель»: это ограничивало пользователей,
хотя водитель может быть пассажиром и наоборот. При регистрации всегда создаётся `User.role = PASSENGER`;
`role` — служебное поле для доступа (публикация, модерация), а не социальный ярлык.

- Водительские возможности открывает `DriverProfile`: `POST /api/driver/register` (авто) → роль `DRIVER`.
- Один аккаунт: водитель может бронировать чужие поездки, пассажир — добавить авто и публиковать.
- Выбор роли не влияет на редирект после регистрации: остаёмся на странице или идём в `callbackUrl`.
- `/onboarding` — приветствие с двумя действиями («Найти попутку» / «Подвезти соседей»), без фиксации роли.

**Карта.** `components/RouteMap.tsx` — статическая карта Яндекс.Карт (`static-maps.yandex.ru/1.x`): `pl` — линия по
остановкам, `pt` — старт/финиш. Leaflet и OpenStreetMap удалены; не возвращать без решения продукта. Без ключа у
Яндекса есть лимиты; при росте — ключ и JS API/2GIS.

**Документация.** Главное руководство — `docs/DEVELOPER-GUIDE.md` (рецепты, API, диагностика). Продуктовые правила —
`PRD.md` §16–17, дизайн — `DESIGN.md`, правила работы — `AGENTS.md`.
