# Архитектура Попутка70 (подетально)

Документ для инженеров и агента: как устроена система, где что лежит, какие контракты и инварианты, как деплоить и расширять. Соответствует коду после инженерного прохода 13.10.2026.

## 1. Стек и платформа

| Слой | Технология | Замечания |
|---|---|---|
| Фронтенд | Next.js 16 (App Router, RSC + клиентские компоненты), React 19, Tailwind v3, motion | шрифты Unbounded/Golos Text/JetBrains Mono |
| API | Route Handlers Next.js (`src/app/api/**`) | единый конверт ответов, zod-валидация |
| БД | PostgreSQL (Neon), Prisma 7 + `@prisma/adapter-pg` | TCP 5432 локально закрыт → миграции через Neon HTTP |
| Сессии | JWT (jose) в httpOnly-cookie, роль/статус читаются из БД | бан и смена роли действуют сразу |
| Платежи | ЮKassa (payments + refunds) | вебхук проверяется перезапросом платежа |
| Push | Web Push (VAPID), сервис-воркер | in-app журнал + push |
| Cron | Vercel Cron (суточный) + GitHub Actions (15 мин) | секрет `CRON_SECRET` (Bearer) |
| Хостинг | Vercel (Hobby), домен poputka70.vercel.app | откат — Instant Rollback |
| CI | GitHub Actions: typecheck → lint → vitest → build | секреты не требуются (сборка без БД деградирует) |

## 2. Карта репозитория

```
src/
  app/                     # страницы и API (App Router)
    page.tsx               # лендинг (статистика из БД, ISR 60с)
    search/                # поиск
    routes/[id]/           # маршрут водителя + список рейсов
    trips/[id]/            # рейс + бронирование
    profile/{,bookings,trips,verify}/   # кабинет пользователя/водителя
    driver/                # кабинет водителя (регистрация, маршруты)
    notifications/         # уведомления + подписка на push
    admin/verifications/   # модерация
    users/[id]/            # публичный профиль
    login/, register/      # тонкие страницы входа
    onboarding/            # выбор роли
    legal/, how-it-works/  # юридика и справка
    api/                   # все эндпоинты (см. §5)
    layout.tsx             # метаданные, OG, шрифты, skip-link, SW-регистрация
    opengraph-image.tsx    # генерация OG-картинки (next/og)
  components/              # UI: лендинг, поиск, брони, кабинет, ui/*
  lib/
    auth.ts                # сессия: JWT + чтение пользователя из БД
    http.ts                # ok()/fail()/errors/parseBody/parseQuery (единый конверт)
    schemas.ts             # все zod-схемы входов
    rate-limit.ts          # in-memory лимитер (демпфер)
    bookings.ts            # жизненный цикл брони: отмена, TTL, возвраты места/сбора
    cron.ts                # задачи: генерация рейсов, напоминания, статусы, TTL
    cron-auth.ts/cron-secret.ts  # Bearer + timingSafeEqual, fail-closed
    pricing.ts             # тарифы, кэш дистанций OSRM, таймауты
    push.ts/push-client.ts # Web Push (+ VAPID_SUBJECT)
    time.ts                # Asia/Tomsk (UTC+7) утилиты, nowMs()
    yookassa.ts            # create/get/refund платежей, таймауты, идемпотентность
    prisma.ts              # PrismaClient + pg Pool (SSL, кэш в globalThis)
data/tomsk-stops.csv       # 1263 строки остановок Томска
prisma/schema.prisma       # модель данных
prisma/migrations/**       # миграции (применяются HTTP-скриптом)
prisma/seed.ts             # идемпотентный сид (точки, админ)
scripts/
  db/apply-migrations-http.mjs  # применение миграций через Neon HTTP + _prisma_migrations
  import-stops.mjs              # импорт остановок из CSV
  cron-call.mjs                 # ручной запуск cron-задач по HTTP
.github/workflows/{ci,cron}.yml
vercel.json                # суточный крон
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

- `User` (роль, статус, рейтинги, реферальный код, `maxVerifiedAt`) 1—1 `DriverProfile`
- `RouteTemplate` (origin/dest → CityPoint или Stop в будущем; время, дни, места, цена, сбор) 1—N `Trip`
- `Trip` (дата, отправление UTC, статус, места, дедлайн) 1—N `Booking`
- `Booking` (статус, сумма, сбор, платёжная ссылка, дедлайн, отмена) 1—1 `Review`
- `Notification`, `PushSubscription`, `DemandRequest`, `Complaint`
- `Stop` — справочник остановок (768), индекс по `nameNormalized` и `isPopular`
- `_prisma_migrations` — журнал миграций (ведётся HTTP-скриптом)

Индексы (добавлены миграцией 20261013120000): Booking(tripId,status), Booking(paymentDeadline), Trip(status,departureTime), Trip(confirmationDeadline), Notification(userId,createdAt), Review(revieweeId), DriverProfile(verificationStatus), PushSubscription(userId), User(referredBy), RouteTemplate(driverId), RouteTemplate(active,isRecurring).

## 5. API-каталог (сжатый)

Конверт: успех `{success:true, ...}`, ошибка `{success:false, error:{code,message,fieldErrors?}}`, коды: VALIDATION_ERROR, AUTH_REQUIRED, FORBIDDEN, NOT_FOUND, CONFLICT, RATE_LIMITED, PAYMENT_REQUIRED, INTERNAL.

| Группа | Эндпоинты |
|---|---|
| Auth | POST /api/auth/login, /register, /logout; GET /me |
| Публичные | GET /api/city-points (15 точек, наследие), GET /api/health, GET /api/pricing/suggest (лимит/IP), GET /api/routes (фильтры from/to/date/passengers) |
| Поиск/справочник | (P0) GET /api/stops — автодополнение по Справочнику остановок |
| Пользователь | GET/POST /api/bookings, POST /api/bookings/[id]/cancel, GET/PATCH /api/notifications, POST /api/demand-requests, POST /api/reviews (GET — список), POST /api/push-subscriptions (+DELETE), GET/POST /api/referrals |
| Водитель | POST /api/driver/register, POST /api/driver/verify (multipart ≤3 МБ ×2, сигнатуры файлов), POST /api/routes (создание) |
| Платежи | POST /api/payments/create, POST /api/payments/webhook |
| Трипы (водитель) | POST /api/trips/[id]/confirm-today, POST /api/trips/[id]/cancel |
| Админ | GET /api/admin/verifications, PATCH /api/admin/verifications/[id], GET /api/admin/verifications/[id]/photo?kind=license|car |
| Cron | GET /api/cron/{generate-trips,send-reminders,confirmation-deadlines,start-trips,complete-trips,expire-unpaid,daily} — все под Bearer |

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
