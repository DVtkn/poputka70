# AGENTS.md — правила работы над Poputka70

Документ обязателен для людей и ИИ-агентов. Читать целиком перед первой правкой.

## 1. Что за проект

Poputka70 — карпулинг в Томске (Next.js 16 + Prisma 7 + Neon + Vercel). Прод: https://poputka70.vercel.app.
Репозиторий: `DVtkn/poputka70`. Продуктовые правила — `PRD.md`, архитектура — `ARCHITECTURE.md`,
главное руководство разработчика — `docs/DEVELOPER-GUIDE.md`.

## 2. Главные правила продукта

- **Роли не фиксируются при регистрации.** Форма не спрашивает «пассажир или водитель»; всегда создаётся
  `User.role = PASSENGER`. Водителем становится тот, кто добавил автомобиль (`DriverProfile`), и он же может
  оставаться пассажиром. **Не возвращайте выбор роли в регистрацию.**
- **Место закрепляется после одобрения водителем:** заявка PENDING → CONFIRMED/CANCELLED; отказ возвращает место.
- **Платформа бесплатна:** пассажир платит водителю напрямую, сервисный сбор 0.
- **Карта только русская:** Яндекс.Карты (`static-maps`), Leaflet/OpenStreetMap удалены — не возвращать.
- **Язык интерфейса и текстов — русский**, живой, без канцелярита и англицизмов.

## 3. Обязательные проверки

```bash
npm run verify   # typecheck + lint + test
npm run build    # verify + next build
node scripts/smoke-prod.mjs   # после деплоя, для критичных изменений
```

Перед коммитом — независимый ревью диффа. Блокеры чинить до деплоя. После деплоя — healthcheck и сценарий изменения.

## 4. Дисциплина правок

- Минимальные точечные диффы; не переписывать файлы целиком без необходимости.
- TypeScript strict, без `any` и выдуманных интерфейсов; входы API — zod (`lib/schemas.ts`).
- Время — `Asia/Tomsk` (`lib/time.ts`); не использовать `new Date()` в бизнес-логике.
- Не делать попутных рефакторингов в рамках задачи.
- Перед архитектурными развилками (новые модули, схема БД, крупные рефакторинги) — консультация архитектора.

## 5. Git и деплой

- Коммиты: осмысленное сообщение в императиве, один логический блок на коммит.
- **Не пушить `.github/workflows/`** — у креденшела нет scope `workflow`; коммит: `git add -A -- ':!.github'`.
- Пуш в `main` запускает прод-деплой: `npx vercel deploy --prod --scope=vtkn1 --yes`.
- Откат — Instant Rollback в панели Vercel. Секреты — только в env Vercel, не в репозитории.

## 6. База данных

- Схема — `prisma/schema.prisma`; после правок `npx prisma generate`.
- Миграции — SQL в `prisma/migrations/**`, применять HTTP-скриптом (TCP 5432 локально закрыт):
  `node --env-file=.env scripts/db/apply-migrations-http.mjs`.
- В проде — только аддитивные миграции; журнал `_prisma_migrations` проверять после применения.
- Не коммитить `.env`, пароли, `run-migration*.mjs` с живыми строками.

## 7. Безопасность

- Сессия JWT httpOnly; роль/статус из БД (кэш 5 с); бан действует без перелогина.
- Все мутации проверяют владельца ресурса; `userId` брать только из сессии.
- Лимиты на аутентификацию и чувствительные действия; cron — fail-closed по `CRON_SECRET`.
- Телефон и документы не отдавать в публичных ответах; ошибки — без стеков.

## 8. Документация

Изменение правил/эндпоинтов/схемы → обновить `docs/DEVELOPER-GUIDE.md`, при продуктовых изменениях — `PRD.md`,
при архитектурных — `ARCHITECTURE.md`. Дизайн-токены — `DESIGN.md`, принципы — `PRODUCT.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
