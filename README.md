# Poputka70 — платформа совместных поездок (Томск)

Next.js 16 + TypeScript + Prisma 7 (PostgreSQL/Neon) + Vercel. Прод: https://poputka70.vercel.app

**Документы:** `PRD.md` — продукт и логика, `ARCHITECTURE.md` — архитектура, `LAUNCH.md` — системный промт агента и план запуска.

## Быстрый старт

```bash
npm install
cp .env.example .env.local   # DATABASE_URL, JWT_SECRET
npm run dev
```

## Проверки

```bash
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run test        # vitest (unit)
npm run build       # next build
```

## База данных

- Миграции: складывать в `prisma/migrations/**`, применять HTTP-скриптом (локально TCP 5432 закрыт):
  `node --env-file=.env scripts/db/apply-migrations-http.mjs`
- Сид (идемпотентный): `node --env-file=.env prisma/seed.ts` (полная очистка — только с `--reset`).
- Остановки Томска: `node --env-file=.env scripts/import-stops.mjs` (источник — `data/tomsk-stops.csv`, 768 уникальных записей).

## Cron-задачи

Задачи: `generate-trips`, `send-reminders`, `confirmation-deadlines`, `start-trips`, `complete-trips`, `expire-unpaid` (+ композит `daily`).
Все защищены `Authorization: Bearer $CRON_SECRET` (fail-closed: без секрета недоступны нигде).

```bash
CRON_SECRET=... BASE_URL=https://poputka70.vercel.app node scripts/cron-call.mjs [job]
```

Расписание: Vercel Cron — суточный `daily` (15:00 UTC = 22:00 Томска); частые задачи — GitHub Actions `Cron` каждые 15 минут (нужен секрет репозитория `CRON_SECRET`).

> Внимание: файлы `.github/workflows/*` не запушены автоматически — у используемого git-креденшела нет scope `workflow`.
> Добавь их одним из способов: (а) обнови доступ git (`gh auth refresh -s workflow` или PAT с галочкой workflow) и запушь; (б) создай workflows через веб-интерфейс GitHub (Actions → New workflow → вставить содержимое файлов).

## Деплой

```bash
npx vercel deploy --prod --scope=vtkn1 --yes
```

Откат — Instant Rollback в панели Vercel. Секреты — в переменных окружения Vercel (список — в PRD, приложение A).

## Ключевые особенности

- Сессия: JWT в httpOnly-cookie; роль и статус читаются из БД на каждый запрос (бан действует мгновенно).
- Брони: атомарное списание мест, дедлайн оплаты, отмена пассажиром/водителем с возвратом места и сбора.
- Платежи ЮKassa: вебхук проверяется перезапросом платежа; без ключей работает режим «оплата при посадке».
- Уведомления: in-app + Web Push (VAPID).
- PWA: манифест, иконки, сервис-воркер (кэш только статики), OG-картинка.
