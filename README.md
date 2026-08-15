# Poputka70 — Carpooling Platform

Платформа для совместных поездок (carpooling). Next.js приложение с API, админкой и водительской панелью.

## Стек

- Next.js (App Router)
- TypeScript
- Prisma + PostgreSQL (Neon)
- YooKassa (платежи)
- Web Push (уведомления)
- Cron-джобы (генерация поездок, напоминания, завершение)

## Структура

- `src/app/` — страницы (поиск, маршруты, профиль, водитель, админ, юридические)
- `src/app/api/` — REST API (auth, поездки, бронирования, платежи, cron, уведомления)
- `src/components/` — UI-компоненты (shadcn-стиль) и бизнес-блоки
- `src/lib/` — логика (auth, pricing, push, yookassa, referral, cron)
- `prisma/` — схема БД и миграции
- `scripts/` — вспомогательные скрипты (генерация поездок, сид)

## API-эндпоинты (основные)

- `POST /api/auth/login|register|logout` — авторизация
- `GET|POST /api/trips`, `POST /api/trips/:id/cancel|confirm-today` — поездки
- `POST /api/bookings` — бронирования
- `POST /api/payments/create`, `POST /api/payments/webhook` — YooKassa
- `POST /api/driver/register|verify` — водители
- `GET|POST /api/admin/verifications` — админка верификации
- `GET|POST /api/cron/*` — cron-джобы
- `POST /api/push-subscriptions` — уведомления

## Запуск

```bash
npm install
cp .env.example .env.local  # заполните DATABASE_URL, JWT_SECRET
npm run dev
```

## Переменные окружения

См. `.env.example`:
- `DATABASE_URL` — строка подключения PostgreSQL
- `JWT_SECRET` — секрет для JWT
- `YOOKASSA_SECRET_KEY`, `YOOKASSA_SHOP_ID` — платёжные ключи (задаются в окружении Vercel)
