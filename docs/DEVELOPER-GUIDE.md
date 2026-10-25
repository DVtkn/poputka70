# Руководство разработчика Poputka70

Версия: 17.10.2026. Документ для тех, кто продолжит проект: как устроено, где что лежит, как менять и не ломать.

---

## 1. Продукт за 60 секунд

Poputka70 — карпулинг для Томска: водитель публикует поездку по городу (маршрут из официального реестра или коридор),
пассажир просит место на отрезке «сел → вышел», водитель принимает или отклоняет. Платформа бесплатна: пассажир платит
водителю напрямую. Ключевая модель — **заявка, а не мгновенная бронь**: место закрепляется только после одобрения.

**Роли не фиксируются при регистрации.** Аккаунт один: искать попутку и публиковать поездки можно с одного логина.
Водительские возможности открываются добавлением автомобиля (`DriverProfile`). `User.role` — служебное поле
(`PASSENGER` по умолчанию, `DRIVER` после регистрации авто, `ADMIN` вручную), а не «выбор судьбы».

---

## 2. Стек и требования

| Слой | Технология |
|---|---|
| Фронтенд/бэкенд | Next.js 16, App Router, React 19, TypeScript strict |
| Стили | Tailwind CSS 4 + дизайн-токены в `globals.css` |
| БД | PostgreSQL (Neon), Prisma 7 (`prisma-client-js`) |
| Сессии | JWT (jose), httpOnly-cookie, роль/статус из БД |
| Валидация | zod (все входы API) |
| Push | web-push + VAPID |
| Карта | Яндекс.Карты, static-maps (без ключа) |
| Тесты | Vitest (unit), smoke-скрипт (prod) |
| Деплой | Vercel (Hobby), прод-алиас `poputka70.vercel.app` |

Требования: Node 20+, npm. Локально TCP 5432 к Neon **закрыт** — миграции только HTTP-скриптом.

---

## 3. Быстрый старт

```bash
cd ~/Projects/poputka70
npm install
cp .env.example .env          # минимум DATABASE_URL и JWT_SECRET
npx prisma generate
npm run dev
```

Полезно сразу:

```bash
npm run verify                # typecheck + lint + test
npm run build                 # verify + next build
node --env-file=.env scripts/db/apply-migrations-http.mjs   # миграции
node --env-file=.env prisma/seed.ts                         # сид (точки, админ)
```

---

## 4. Карта репозитория

```
src/
  app/
    page.tsx                  # лендинг: статистика, ближайшие поездки, поиск
    search/                   # поиск по остановкам/дате
    trips/[id]/               # поездка: карта, остановки, заявка
    trips/new/                # публикация поездки (только с DriverProfile)
    profile/                  # кабинет: заявки, поездки, редактирование
    profile/trips/            # поездки водителя + «Хотят поехать»
    driver/                   # добавление автомобиля, статус водителя
    users/[id]/               # публичный профиль и отзывы
    onboarding/               # приветствие без фиксации роли
    login/, register/         # тонкие страницы (модалка входа)
    admin/verifications/      # модерация документов
    api/                      # REST-эндпоинты (см. §7)
    layout.tsx                # шрифты, метаданные, safe-area, SW
  components/
    RouteMap.tsx              # карта маршрута (Яндекс, static-maps)
    AuthModal.tsx             # вход/регистрация (без выбора роли)
    StickyHeader.tsx, MobileDock.tsx, AppShell.tsx
    ui/*                      # Button, Input, Card, Modal, Toast...
  lib/
    auth.ts                   # сессия, getUserFromRequest, requireAuth
    http.ts                   # ok/fail, errors, parseBody, parseQuery
    schemas.ts                # все zod-схемы
    trips.ts                  # публикация поездок, снимок маршрута
    route-registry.ts         # поиск маршрута в реестре + координаты
    bookings.ts               # жизненный цикл брони
    maintenance.ts            # ленивые статусы поездок
    push.ts                   # Web Push + журнал
    rate-limit.ts             # in-memory лимитер
    time.ts                   # Asia/Tomsk
  middleware.ts               # защита приватных страниц
prisma/
  schema.prisma               # модели
  migrations/**               # SQL-миграции (HTTP-применение)
data/
  tomsk-stops.csv             # 768 остановок
  tomsk-route-registry.json   # 34 маршрута с порядком остановок
scripts/
  db/apply-migrations-http.mjs
  import-stops.mjs
  smoke-prod.mjs              # 13 шагов проверки прода
  cron-call.mjs
docs/DEVELOPER-GUIDE.md       # этот файл
```

---

## 5. Модель данных (ключевое)

- **User** — логин, bcrypt-пароль, имя/фамилия, телефон (уникальный, виден водителю только после принятия),
  `bio` ≤500, `role` (служебная), `status` (ACTIVE/BANNED), `ratingAsDriver`, `ratingAsPassenger`, `reviewCount*`,
  реферальный код. 1—1 `DriverProfile`.
- **DriverProfile** — авто (модель/номер/цвет), верификация, `maxSeats`. Наличие профиля = право публиковать поездки.
- **Trip** — снимок поездки: `fromName/toName`, координаты, `date/time`, `seats/availableSeats`, `price`,
  `routeNumber`, `routeStops` (JSONB — массив `{name,lat,lng}` по порядку), `status`, водитель.
  `availableSeats >= 0` (CHECK), частичный уникальный индекс активной брони.
- **Booking** — заявка на отрезок: `pickupStopId/dropoffStopId` + снимки имён, `amountDue`, `status`
  (PENDING → CONFIRMED / CANCELLED / COMPLETED), пассажир, поездка.
- **Stop** — 768 остановок: `name`, `nameNormalized`, координаты, `kind` (stop/landmark).
- **CityPoint** — 15 ориентиров (вузы, ТЦ, вокзалы) с исправленными координатами.
- **Review** — 1–5 + текст, одна на бронь, только после COMPLETED; пересчёт рейтингов в транзакции.
- **Notification**, **PushSubscription**, **DemandRequest**, **RouteTemplate** — уведомления, подписки, спрос, серии.

Инварианты: нельзя занять больше мест, чем свободно; нельзя две активные заявки на одну поездку; посадка раньше высадки;
цена отрезка — доля пути (мин. 50 ₽); отмена пассажиром — не позднее 60 минут.

---

## 6. Роли и доступ

| Что | Как проверяется |
|---|---|
| Регистрация | Всегда `PASSENGER`; поля роли в API больше нет |
| Публикация поездки | `requireAuth` + наличие `DriverProfile` |
| Стать водителем | `POST /api/driver/register` (авто) → роль `DRIVER`, доступ к публикации |
| Пассажир-водитель | Один аккаунт: водитель может бронировать чужие поездки, пассажир — добавить авто |
| Админ | `role === "ADMIN"` + статус ACTIVE; модерация в `/admin/verifications` |
| Бан | `status !== ACTIVE` → 403 на защищённых действиях; кэш 5 с инвалидируется |

`src/middleware.ts` закрывает приватные страницы; API дополнительно проверяет владельца ресурса
(поездка/бронь/профиль). Никогда не доверяйте `userId` из тела запроса — берите из сессии.

---

## 7. API

Единый конверт: успех `{ success: true, ...data }`, ошибка `{ success: false, error: { code, message } }`.
Коды: `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`, `RATE_LIMITED`, `INTERNAL`.
Все тела валидируются zod через `parseBody`; ошибки — русским текстом для пользователя.

| Метод и путь | Доступ | Назначение |
|---|---|---|
| `POST /api/auth/register` | гость | Регистрация (login, password, firstName, lastName, referralCode) → PASSENGER |
| `POST /api/auth/login` | гость | Вход, httpOnly-сессия |
| `POST /api/auth/telegram` | гость | Вход/регистрация через Telegram (HMAC initData / Widget) → PASSENGER |
| `POST /api/auth/logout` | вход | Выход |
| `GET /api/auth/me` | вход | Текущий пользователь, роль, профиль водителя |
| `PATCH /api/profile` | вход | Имя, фамилия, телефон, bio |
| `POST /api/profile/password` | вход | Смена пароля (текущий обязателен) |
| `POST /api/driver/register` | вход | Авто → DriverProfile + роль DRIVER |
| `GET /api/trips` | все | Лента; `from/to/date` — поиск по коридору ≤700 м |
| `POST /api/trips` | водитель | Публикация (разово/серия), снимок маршрута |
| `GET /api/trips/[id]` | все | Поездка, остановки, водитель |
| `POST /api/trips/[id]/quote` | все | Цена отрезка |
| `POST /api/bookings` | вход | Заявка PENDING |
| `POST /api/bookings/[id]/accept` | водитель поездки | Принять, списать место |
| `POST /api/bookings/[id]/decline` | водитель поездки | Отклонить, вернуть место |
| `POST /api/bookings/[id]/cancel` | пассажир | Отмена за ≥60 мин |
| `POST /api/reviews` | участник | Отзыв после COMPLETED |
| `GET /api/notifications` | вход | Журнал уведомлений |
| `POST /api/push/subscribe` | вход | Подписка Web Push |
| `POST /api/bot/telegram` | Telegram | Вебхук бота (поиск поездок, Mini App, защита по secret_token) |
| `POST /api/cron/[job]` | Bearer | Крон, fail-closed |

Лимиты: регистрация 5/час с IP, вход 10/15 мин, смена пароля/профиль — отдельные окна. Лимитер in-memory
(демпфер на инстанс), для строгого лимита — WAF Vercel.

---

## 8. Потоки

**Регистрация.** Модалка → `POST /api/auth/register` → сессия → редирект на `callbackUrl` или остаётся на странице.
Выбора роли нет; в форме подсказка «водителем станешь, когда добавишь автомобиль».

**Публикация.** `/trips/new` (нужен DriverProfile) → `POST /api/trips` → поиск маршрута в реестре → снимок
`routeStops/routeNumber` → редирект `/trips/[id]`. Повторная отправка не создаёт дубль (идемпотентность формы).

**Заявка.** Страница поездки → выбор остановок (bottom sheet) → `POST /api/bookings` (PENDING) → водитель видит
в `/profile/trips` → accept/decline. При accept место списывается атомарно, телефоны раскрываются, push обоим.

**Отмена.** Пассажир — за ≥60 мин, место возвращается; водитель — отмена поездки, всем пассажирам push и возврат.

**Завершение и отзывы.** Поездка завершается по времени (лениво, `maintenance.ts`) → обе стороны могут оставить отзыв;
рейтинги пересчитываются раздельно.

**Серии.** `repeat: none|weekdays|weekends|daily` — генерация рейсов на 2 недели кроном `generate-trips`.

---

## 9. Соглашения кода

- TypeScript strict, **без `any`** и выдуманных интерфейсов; типы — из Prisma или явные.
- Все входящие данные — через zod-схему в `lib/schemas.ts`; ответы — через `ok()/errors`.
- Время — только `Asia/Tomsk` (`lib/time.ts`), не `new Date()` в бизнес-логике.
- Серверные компоненты по умолчанию; `"use client"` — только для интерактива.
- UI: токены и классы дизайн-системы (`bg-snow`, `text-taiga`, `card`), без магических цветов; тексты — по-русски.
- Точечные диффы, без попутных рефакторингов; перед архитектурными развилками — консультация архитектора.
- Секреты — только в env; не коммитить `.env`, пароли, `run-migration*.mjs` с живыми строками.

---

## 10. Рецепты

**Новый эндпоинт.** `src/app/api/<path>/route.ts` → `parseBody/parseQuery` → проверка сессии/владельца → Prisma →
`ok()/errors`; добавить тест в `src/lib/*.test.ts`; при новом поле — миграция.

**Новая страница.** `src/app/<path>/page.tsx` (server) + клиентские компоненты; проверить мобильный вид 390×844,
safe-area и док; добавить ссылку в навигацию, если раздел публичный.

**Изменить схему БД.** Правка `prisma/schema.prisma` → `npx prisma migrate diff`/ручная SQL-миграция в
`prisma/migrations/<timestamp>_name/migration.sql` → `npx prisma generate` → применить HTTP-скриптом → проверить
журнал `_prisma_migrations` → задеплоить. Миграции только аддитивные в проде.

**Обновить реестр маршрутов.** Excel → `data/tomsk-route-registry.json` (направления и остановки по порядку) →
перезапустить импорт координат при необходимости; старые поездки не переписываются (снимок).

**Добавить уведомление.** `createNotificationPayload` + `sendNotificationToUser` (журнал + push); текст — короткий,
с ссылкой на действие; не спамить: одно событие — одно уведомление.

**Новый cron.** `src/app/api/cron/[job]/route.ts` + задача в `lib/cron.ts` + запись в `vercel.json`; защита
`CRON_SECRET` fail-closed; ручной запуск `scripts/cron-call.mjs`.

**Отладка прода.** `curl https://poputka70.vercel.app/api/health` → логи Vercel (`vercel logs`) → проверить env →
повторить сценарий `scripts/smoke-prod.mjs` (создаёт и удаляет `smoke-%` пользователей).

**Мониторинг здоровья.** `node --env-file=.env scripts/health-check.mjs` — проверяет `/api/health`, главную,
поиск, API ленты, остановки и БД. Можно добавить в cron (каждое утро недели запуска).

**Сид первых маршрутов.** `node --env-file=.env scripts/seed-first-routes.mjs` — создаёт RouteTemplate на 10 ключевых
коридорах Томска (идемпотентно, не создаёт дубли). Требует существующего пользователя с ролью DRIVER.

---

## 11. Тесты и качество

```bash
npm run typecheck
npm run lint
npm run test          # vitest: цены, время, брони, схемы
npm run verify        # всё вместе
npm run build         # verify + next build
node scripts/smoke-prod.mjs   # 13 шагов на проде (нужен CRON_SECRET? нет — публичные сценарии)
```

Правило: любое изменение логики — с тестом; перед коммитом — независимый ревью диффа; блокеры чинить до деплоя.
E2E-наборов нет; критичные сценарии покрывает smoke + unit.

---

## 12. Окружение и деплой

Обязательные: `DATABASE_URL`, `JWT_SECRET`, `NEXT_PUBLIC_APP_URL`.
Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_SUBJECT`.
Крон: `CRON_SECRET` (fail-closed). ЮKassa: `YOOKASSA_SHOP_ID/SECRET_KEY` (опционально, сейчас режим «оплата при посадке»).

```bash
npx vercel deploy --prod --scope=vtkn1 --yes
```

После деплоя: health, лента, страница поездки с картой, вход, регистрация (без роли), публикация, заявка.
Откат — Instant Rollback. Секреты не печатать в логи; при утечке — ротация.

---

## 13. Карта

`components/RouteMap.tsx` — серверный компонент, отдаёт `<img>` на `static-maps.yandex.ru/1.x`:
`pl` — линия по координатам остановок, `pt` — зелёный старт и красный финиш; подпись «© Яндекс Карты» и ссылка
«Открыть в Яндекс.Картах» (`rtext`). **Leaflet и OpenStreetMap удалены** — не возвращать.
Ограничения: без ключа есть лимиты запросов; при росте — ключ Яндекса и JS API (или 2GIS). Если остановок <2 с
координатами — карта не рендерится, остаётся список.

---

## 14. PWA и push

Манифест (`app/manifest.ts`), `appleWebApp`, safe-area, `100dvh`. Установка: Android — `beforeinstallprompt`,
iOS — инструкция «Поделиться → На экран Домой». Push на iOS — **только после установки** (16.4+), до запроса
разрешения показываем объяснение. Сервис-воркер кэширует только статику, API — network-first.

---

## 15. Безопасность

- JWT httpOnly/SameSite=Lax, срок 7 дней; роль и статус читаются из БД (кэш 5 с) — бан мгновенный.
- Пароли bcrypt; смена пароля инвалидирует сессии; телефон уникален и не попадает в публичные ответы.
- Проверки владельца на каждой мутации; никаких действий «по id из тела» без сверки с сессией.
- Лимиты на аутентификацию и чувствительные действия; cron fail-closed; ошибки не раскрывают стек.

### WAF rate limiting (Vercel Dashboard)
Код уже имеет in-memory rate limiting на `/api/auth/*` (регистрация 5/час, вход 20/15 мин, смена пароля 5/час).
Для жёсткой защиты на уровне edge добавлен `src/middleware.ts` (20 запросов/мин с IP на все `/api/auth/*`).
Дополнительно в панели Vercel → Project → Settings → Security → WAF:
- Создать правило Rate Limit для пути `/api/auth/*`: 30 запросов в минуту с одного IP.
- Действие: Block, статус 429.
- Применить на Production.

### РКН (обработка персональных данных)
Перед публичным запуском необходимо подать уведомление в Роскомнадзор о начале обработки ПДн (152-ФЗ).
Ответственный: ДПО (dpo@poputka70.ru). Срок рассмотрения — до 30 дней. Уведомление подаётся через личный кабинет на сайте ркн.рф.

### Контакты
- Поддержка: support@poputka70.ru (уже в футере сайта)
- Юридические вопросы: legal@poputka70.ru
- ДПО: dpo@poputka70.ru

---

## 16. Диагностика

| Симптом | Причина/решение |
|---|---|
| `ECONNREFUSED :5432` | TCP к Neon закрыт — используйте HTTP-скрипт миграций |
| `fetch` к Vercel/Neon таймаутит | особенность сети; повторить/curl, не баг приложения |
| 401 на cron | нет/неверный `CRON_SECRET` (fail-closed) |
| Карта не видна | у остановок нет координат (<2) или лимит Яндекса; проверить `routeStops` |
| `Wrong polyline coord` | в `pl` попал стиль `,blue,4` — стиль не поддерживается |
| Push не приходит на iPhone | приложение не установлено на экран «Домой» |
| Дубли заявок | частичный уникальный индекс активной брони; проверить статус |
| Сборка падает на verify | сначала `npm run typecheck`, затем lint/test |

---

## 17. Чек-лист релиза

1. `npm run verify` и `npm run build` — зелёные.
2. Миграции применены, `prisma generate` выполнен, журнал миграций проверен.
3. `git add -A -- ':!.github'` (workflow-файлы не пушим), коммит с описанием.
4. Push в `main` → деплой Vercel → health ok.
5. Smoke: регистрация без роли → PASSENGER; добавление авто → DRIVER; публикация → карта; заявка → accept.
6. Убрать тестовые данные (`smoke-%`), проверить логи.
7. Обновить документацию, если изменились правила/эндпоинты.

---

## 18. Глоссарий

- **Поездка (Trip)** — опубликованный маршрут водителя с датой, временем, местами и ценой.
- **Заявка (Booking)** — запрос места на отрезке; до одобрения место не закреплено.
- **Коридор** — остановки в ≤700 м от линии A→B, альтернатива реестру.
- **Реестр** — официальные маршруты Томска с порядком остановок.
- **DriverProfile** — автомобиль и право публиковать; роль водителя — следствие, не выбор при регистрации.
- **Ленивые статусы** — досчёт «в пути/завершена» при чтении, без частого крона.

---

## 19. Telegram-бот (@poputka70)

Бот позволяет пассажирам искать попутки прямо в мессенджере (диалогом или свободной фразой вроде «Томск Асино»), а также запускать сервис как Telegram Mini App (TMA).

### Настройка и переменные окружения
1. Создать бота в [@BotFather](https://t.me/BotFather) и получить токен.
2. Задать переменные:
   ```env
   TELEGRAM_BOT_TOKEN="токен_от_BotFather"
   TELEGRAM_WEBHOOK_SECRET="секретная_строка"
   ```
3. Запустить скрипт настройки вебхука и меню:
   ```bash
   node --env-file=.env scripts/bot/setup-webhook.mjs
   ```
4. Вебхук принимает POST на `/api/bot/telegram`, проверяет заголовок `X-Telegram-Bot-Api-Secret-Token` и применяет рейт-лимит по `chat_id`.

