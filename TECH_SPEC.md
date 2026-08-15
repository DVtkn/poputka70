# TECH SPEC: Попутка70 — Лендинг уровня Apple / NVIDIA / Aviasales

## 1. Обзор продукта
**Попутка70** — карпулинг в Томске. «Сосед подвозит соседа». Дешевле такси, быстрее автобуса.
Архитектура: `RouteTemplate → Trip → Booking` (PRD v3.2).

## 2. Стек
- **Framework**: Next.js 16 (App Router, RSC + Client Components)
- **Styling**: Tailwind CSS v3.4 + CSS Variables (токены)
- **Animation**: Framer Motion v13 (scroll-driven, stagger, whileInView)
- **Icons**: Lucide React (stroke 1.5-2, никаких эмодзи в UI)
- **Fonts**: 
  - `Unbounded` (display) — H1, H2, H3, большие цифры
  - `Golos Text` (body) — основной текст
  - `JetBrains Mono` (utility) — цены, время, даты, статистика
- **TypeScript**: strict mode

## 3. Дизайн-токены (НЕ ИЗМЕНЯТЬ)
```css
:root {
  --snow: #FAFAF7;      /* фон */
  --taiga: #14171A;     /* основной текст */
  --river: #1C4E66;     /* действия, primary */
  --birch: #C98A3E;     /* доверие, рейтинг, verified */
  --fog: #E3E6E7;       /* границы, divider */
  --frost: #7C8A93;     /* вторичный текст */
  --ember: #A6432E;     /* ТОЛЬКО ошибки/отмены */
}
```

**Правила использования**:
- `River` — только для CTA, ссылок, активных состояний
- `Birch` — только для доверия (звёзды, verified, бейджи надежности)
- `Ember` — ТОЛЬКО для ошибок, отмен, деструктивных действий
- `Frost` — только для крупного/вторичного текста (WCAG AA)
- Никаких новых цветов

## 4. Типографическая шкала (строго)
| Элемент | Шрифт | Размер | Leading | Tracking |
|---------|-------|--------|---------|----------|
| H1 Hero | Unbounded | `clamp(2.75rem, 7vw, 5.5rem)` | 1.02 | -0.03em |
| H2 Секций | Unbounded | `text-3xl md:text-5xl` | 1.1 | -0.02em |
| H3 Карточек | Unbounded | `text-xl md:text-2xl` | 1.2 | -0.01em |
| Body | Golos | `text-base md:text-lg` | 1.6 | 0 |
| Caption/Overline | Golos | `text-xs` | 1.5 | 0.15em (uppercase) |
| Цифры/Цены/Время | JetBrains Mono | по контексту | 1.2 | 0 |

## 5. Структура лендинга (сверху вниз)

### 5.1 STICKY HEADER
- `position: sticky; top: 0; z-index: 50`
- `backdrop-blur-xl bg-snow/70` + тонкая граница `border-b border-fog/50`
- Логотип: `Попутка70` с gradient text (River→Taiga)
- Справа: кнопка «Войти» (btn-primary, min-height 56px)
- **Поведение**: скрывается при скролле вниз (`translate-y-[-100%]`), появляется при скролле вверх
- Framer Motion: `useScroll` + `useTransform` для opacity/y

### 5.2 HERO (Aviasales-style)
- **Бейдж-пилюля**: `inline-flex`, пульсирующая точка (`animate-pulse`), текст «Карпулинг в Томске»
- **H1**: 2 строки, вторая — `bg-gradient-to-r from-river via-river to-birch bg-clip-text text-transparent`
- **Подзаголовок**: 1 строка, `text-frost text-lg md:text-xl`
- **Поисковая форма** (центр героя, на белой карточке с тенью):
  - 3 поля: `Откуда` (select), `Куда` (select), `Дата` (date input)
  - Кнопка «Найти попутку» с иконкой Search, min-height 56px
  - На мобиле — колонкой, на десктопе — ряд
  - Select'ы загружаются из `/api/city-points` (15 точек Томска)
- **Чипы популярных направлений**: кликабельные, под формой
- **Фон**: mesh-градиент (2 radial-пятна: River 8%, Birch 6%) + анимированная SVG-линия маршрута позади формы

### 5.3 SOCIAL PROOF (полоса)
- Одна строка: `4 маршрута • 3 водителя • 15 точек • ★4.8 средний рейтинг`
- Шрифт: **JetBrains Mono**, `text-sm md:text-base`
- Разделители: точки `•`
- Цвет: `text-taiga/70`

### 5.4 ЛЕНТА МАРШРУТОВ (#routes)
- Карточки как сейчас, **улучшения**:
  - **Gradient border** при hover: `before` с `linear-gradient(135deg, river, birch)` + `mask`
  - **Цена**: `text-4xl md:text-5xl font-utility` с `bg-clip-text gradient (river→birch)`
  - **Стрелка ChevronRight**: при hover `translate-x-1 transition-transform`
  - Stagger-появление: `delay: index * 0.08`
  - Skeleton с shimmer при загрузке

### 5.5 «КАК ЭТО РАБОТАЕТ» (3 шага)
- 3 карточки в гриде
- Номера: градиентные квадраты `w-10 h-10 rounded-xl bg-gradient-to-br from-river to-birch`
- **Пунктирная линия** между карточками на десктопе (как `RouteLine`, но dashed)
- Иконки: Lucide, stroke 1.5
- Stagger: `delay: index * 0.15`

### 5.6 ТЁМНАЯ СЕКЦИЯ (Taiga) — «Почему это работает»
- Фон: `bg-taiga`, полноэкранная
- **2x2 bento-grid**:
  - Крупная карточка (span 2): «Без ожидания» + иконка Clock
  - 3 малые: «Проверенные водители» (Shield), «Компенсация расходов» (Wallet), «Рейтинг» (Star)
- **Glow-пятна**: `absolute radial-gradient` River/Birch 10-15% opacity, blur-3xl
- **Цифры-статистика**: `text-5xl md:text-7xl font-display font-utility` с `bg-clip-text gradient`
- Иконки: Lucide, stroke 1.5, `text-white/60`

### 5.7 CTA ДЛЯ ВОДИТЕЛЯ
- Полноширинная карточка: `bg-gradient-to-br from-river via-river/90 to-taiga`
- Заголовок: `font-display text-3xl md:text-4xl font-bold`
- Кнопка: **белая** `btn-secondary` (white/text-taiga) «Стать водителем»
- Позади: анимированная линия маршрута (как в Hero, но белая, opacity 20%)

### 5.8 FOOTER
- Минималистичный: `bg-snow border-t border-fog`
- 3 ссылки: Оферта, Конфиденциальность, Как работает
- Копирайт: `Попутка70 • Томск • 2026`
- Цвет текста: `text-frost`

## 6. Анимации (Framer Motion)
| Элемент | Анимация | Параметры |
|---------|----------|-----------|
| Hero stagger | fade+up | delay 0.1s каждая: бейдж → H1 → подзаголовок → форма → чипы |
| Секции | whileInView fade+up 30px | once: true, duration 0.7, ease `[0.16,1,0.3,1]` |
| Карточки ленты | stagger | delay 0.08 |
| Цифры статистики | count-up | 0 → значение за 1.2s при whileInView |
| Кнопки | hover: translateY(-2px) + shadow | active: translateY(0) |
| Логотип | hover: letter-spacing +0.02em | transition 0.2s |
| Пульс точки бейджа | animate-pulse | бесконечно |
| Skeleton | shimmer | бесконечно |

**prefers-reduced-motion**: отключает ВСЕ анимации кроме пульса и shimmer

## 7. Качество (Definition of Done)
- [ ] LCP < 2.5s: hero без картинок, только CSS/SVG
- [ ] Тач-таргеты ≥ 44px, кнопки ≥ 56px высота
- [ ] Контраст WCAG AA (Frost на Snow — только крупный текст)
- [ ] prefers-reduced-motion работает
- [ ] focus-visible ring: `ring-2 ring-river ring-offset-2 ring-offset-snow`
- [ ] Mobile-first: форма колонкой до md, гриды 1 колонка до md
- [ ] Никаких новых цветов вне токенов
- [ ] Birch только для доверия, River только для действий
- [ ] Все иконки — Lucide, stroke 1.5-2
- [ ] Тексты по Тону PRD: «Забронировать место», не «Осуществить бронирование»
- [ ] Build проходит без ошибок
- [ ] Lint чистый

## 8. Запрещено
- Стоковые фото в hero
- Glassmorphism везде (только header + форма поиска)
- >1 акцентной заливки на экран
- Бесконечные карусели/автопрокрутки
- Тени черным — только tinted (rgba от River/Taiga)

## 9. API Endpoints (используемые)
- `GET /api/city-points` — 15 точек Томска для select'ов
- `GET /api/routes` — список маршрутов для ленты
- `POST /api/auth/logout` — выход

## 10. Компоненты для создания/обновления
1. `src/app/globals.css` — токены, утилиты, анимации
2. `src/components/StickyHeader.tsx` — NEW (client)
3. `src/components/Hero.tsx` — NEW (client, с SearchForm внутри)
4. `src/components/SearchForm.tsx` — REWRITE (client, select из API)
5. `src/components/SocialProof.tsx` — NEW (client)
6. `src/components/RouteList.tsx` — REWRITE (client, gradient border, price, arrow)
7. `src/components/HowItWorks.tsx` — NEW (client, пунктирная линия)
8. `src/components/WhyItWorks.tsx` — NEW (client, bento-grid, glow, count-up)
9. `src/components/DriverCTA.tsx` — NEW (client, animated line)
10. `src/components/Footer.tsx` — NEW (client)
11. `src/app/page.tsx` — REWRITE (RSC, собирает секции)
12. `src/components/UserGreeting.tsx` — UPDATE (логотип gradient, интеграция в header)