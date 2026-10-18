# Poputka70 — платформа совместных поездок (Томск)

Next.js 16 (App Router) + TypeScript + Prisma 7 + PostgreSQL (Neon) + Vercel.
Прод: **https://poputka70.vercel.app** · Репозиторий: `DVtkn/poputka70`

> **Главное правило продукта:** роли «пассажир/водитель» **не выбираются при регистрации**.
> Аккаунт один: любой пользователь может искать попутку, а водителем становится, когда добавит автомобиль
> (`DriverProfile`). Водитель может быть пассажиром и наоборот — ограничений нет.

## Документация

| Файл | Для чего |
|---|---|
| **`docs/DEVELOPER-GUIDE.md`** | Главное руководство разработчика: модель данных, потоки, API, рецепты, деплой, диагностика |
| `PRD.md` | Продукт: сценарии, экраны, правила, §16 роли/доверие, §17 маршрут/карта |
| `ARCHITECTURE.md` | Архитектура: рантайм, таблицы, API, инварианты |
| `PRODUCT.md`, `DESIGN.md` | Продуктовые принципы и дизайн-система (токены, компоненты, типографика) |
| `LAUNCH.md` | План запуска и дежурные чек-листы |
| `MARKETING.md` | Маркетинговая стратегия, каналы привлечения в Томске, growth loops и план роста |
| `AGENTS.md` | Обязательные правила для ИИ-агентов и разработчиков |
| `IDEA.md` | Концепция «живой ленты поездок» |

## Быстрый старт

```bash
npm install
cp .env.example .env        # DATABASE_URL, JWT_SECRET; остальное — по желанию
npm run dev                 # http://localhost:3000
```

Проверки перед коммитом:

```bash
npm run verify   # typecheck + lint + test
npm run build    # verify + next build
```

## База данных

- Схема — `prisma/schema.prisma`; после изменений: `npx prisma generate`.
- Миграции складывать в `prisma/migrations/**` и применять **HTTP-скриптом** (локально TCP 5432 закрыт):
  `node --env-file=.env scripts/db/apply-migrations-http.mjs`
- Сид (идемпотентный): `node --env-file=.env prisma/seed.ts`; полная очистка — только с `--reset`.
- Остановки Томска: `node --env-file=.env scripts/import-stops.mjs` (источник `data/tomsk-stops.csv`, 768 уникальных).
- Реестр маршрутов: `data/tomsk-route-registry.json` (34 направления), используется при публикации поездки.

## Cron

Задачи: `generate-trips`, `send-reminders`, `confirmation-deadlines`, `start-trips`, `complete-trips`, `expire-unpaid` (+ композит `daily`).
Все защищены заголовком `Authorization: Bearer <CRON_SECRET>`; без секрета — fail-closed.

```bash
CRON_SECRET=... BASE_URL=https://poputka70.vercel.app node scripts/cron-call.mjs daily
```

Расписание: Vercel Cron — суточный `daily` (15:00 UTC = 22:00 Томска). Статусы поездок досчитываются лениво
(`lib/maintenance.ts`) на страницах кабинета и в ленте, поэтому корректность не зависит от частых кронов.

> GitHub Actions (`.github/workflows/`) лежат локально и **не запушены**: у git-креденшела нет scope `workflow`.
> Пока их нет, все проверки выполняет `npm run build`, а напоминания — суточный крон.

## Деплой

```bash
npx vercel deploy --prod --scope=vtkn1 --yes
```

Откат — Instant Rollback в панели Vercel. Переменные окружения — в Vercel → Settings → Environment Variables
(полный список и назначение — в `docs/DEVELOPER-GUIDE.md`, раздел «Окружение»).

## Ключевые особенности

- **Один аккаунт без выбора роли.** `User.role` остаётся служебным (`PASSENGER`/`DRIVER`/`ADMIN`), но при регистрации всегда `PASSENGER`; водительские возможности открывает `DriverProfile` (авто).
- **Поездка — самостоятельная сущность** со снимком маршрута, цены и мест; заявка (`Booking`) — отрезок между остановками.
- **Место закрепляется после одобрения водителем:** PENDING → CONFIRMED / CANCELLED; отказ возвращает место и уведомляет.
- **Оплата напрямую водителю**, сервисный сбор 0; ЮKassa-инфраструктура остаётся на будущее.
- **Карта маршрута — Яндекс.Карты** (статическая, линия + старт/финиш, без Leaflet/OSM); см. §17 PRD.
- **Безопасность:** JWT в httpOnly-cookie, роль/статус из БД с кэшем 5 с, zod-валидация, лимиты, проверки владельца, fail-closed cron.
- **PWA:** установка на iPhone/Android, push после установки, офлайн-кэш только статики.
