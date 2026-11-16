"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Car,
  Check,
  Copy,
  Download,
  Eye,
  Maximize2,
  Moon,
  Search,
  Send,
  ShieldCheck,
  Sun,
  X,
} from "lucide-react";

type AvatarVariantId = "front" | "isometric" | "cabin";
type PreviewScreen = "chat_list" | "bot_intro" | "safe_zone";
type TelegramTheme = "light" | "dark";

interface AvatarVariant {
  id: AvatarVariantId;
  title: string;
  subtitle: string;
  rationale: string;
  recommended?: boolean;
  src: string;
  fileSlug: string;
  squareZoom: number;
}

const AVATAR_VARIANTS: AvatarVariant[] = [
  {
    id: "front",
    title: "Фронтальный силуэт",
    subtitle: "Симметричный анфас · янтарные фары",
    rationale:
      "Два попутчика за лобовым стеклом считываются мгновенно, симметрия идеально ложится в круглый вырез Telegram.",
    recommended: true,
    src: "/bot/avatar-front.png",
    fileSlug: "poputka70-bot-avatar-front",
    squareZoom: 1.06,
  },
  {
    id: "isometric",
    title: "Изометрия 3/4",
    subtitle: "Объёмный ракурс · линия маршрута",
    rationale:
      "Создаёт ощущение движения и дороги: оба силуэта видны в салоне, янтарная дуга подчёркивает совместный путь.",
    src: "/bot/avatar-isometric.png",
    fileSlug: "poputka70-bot-avatar-isometric",
    squareZoom: 1,
  },
  {
    id: "cabin",
    title: "Салон крупным планом",
    subtitle: "Максимальный контраст на 40px",
    rationale:
      "Укрупнённые фигуры водителя и пассажира в тёплой янтарной рамке — не теряются даже в плотном списке чатов.",
    src: "/bot/avatar-cabin.png",
    fileSlug: "poputka70-bot-avatar-cabin",
    squareZoom: 1,
  },
];

const COVER_ASSET = {
  title: "Обложка описания бота",
  subtitle: "16:9 · 640×360 для /setdescriptionpic",
  src: "/bot/cover.png",
  fileSlug: "poputka70-bot-cover",
};

const BOTFATHER_FIELDS = [
  {
    key: "name",
    command: "/setname",
    label: "Имя бота",
    limit: "до 64 симв.",
    value: "Попутка70 — поездки по Томску",
  },
  {
    key: "about",
    command: "/setabouttext",
    label: "Краткое описание (About)",
    limit: "до 120 симв.",
    value: "Поиск и публикация поездок по Томску и пригороду без комиссии.",
  },
  {
    key: "description",
    command: "/setdescription",
    label: "Текст «Что умеет этот бот?»",
    limit: "до 512 симв.",
    value:
      "Попутка70 — поиск и публикация поездок по Томску без комиссии.\n\n• Поиск по остановкам и карта маршрутов в Mini App.\n• Публикация рейса и чат с участниками поездки.\n\nНажмите «Запустить», чтобы открыть поиск.",
  },
  {
    key: "commands",
    command: "/setcommands",
    label: "Команды меню",
    limit: "список команд",
    value:
      "start - Главное меню и поиск\nsearch - Найти поездку по маршруту\nrecent - Ближайшие рейсы\nhelp - О сервисе",
  },
];

const MOCK_CHATS = [
  {
    id: "saved",
    name: "Избранное",
    preview: "Заметки по поездке на пятницу",
    time: "18:40",
    initials: "И",
    bg: "#1E5B43",
    unread: 0,
  },
  {
    id: "bot",
    name: "Попутка70",
    preview: "Найдено 3 рейса от Лагерного сада на 19:15",
    time: "18:24",
    isBot: true,
    unread: 2,
  },
  {
    id: "neighbors",
    name: "Южные Ворота · Поездки",
    preview: "Алексей: выезжаю в центр через 15 минут",
    time: "17:52",
    initials: "ЮВ",
    bg: "#4A6B5D",
    unread: 0,
  },
  {
    id: "tsu",
    name: "Кампус ТГУ · Объявления",
    preview: "Расписание корпуса на следующую неделю",
    time: "15:10",
    initials: "ТГ",
    bg: "#8A4E12",
    unread: 0,
  },
  {
    id: "tomsk",
    name: "Новости Томска",
    preview: "На проспекте Ленина открыли движение",
    time: "12:05",
    initials: "НТ",
    bg: "#3B5266",
    unread: 0,
  },
];

function ResilientImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#141916] to-[#123A2A] text-snow p-4 text-center ${className ?? ""}`}
      >
        <Car className="w-8 h-8 text-birch-light mb-2" strokeWidth={1.5} aria-hidden="true" />
        <span className="text-xs font-medium text-snow/80">{alt}</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- Canvas-экспорт и мгновенный локальный превью-рендер
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

async function downloadProcessedImage({
  src,
  filename,
  width,
  height,
  circular = false,
  zoom = 1,
}: {
  src: string;
  filename: string;
  width: number;
  height: number;
  circular?: boolean;
  zoom?: number;
}) {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.referrerPolicy = "no-referrer";

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = src;
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  if (circular) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, Math.min(width, height) / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  // Cover-fit with optional zoom so round badge edges don't leave pale corners in square export
  const imgRatio = img.naturalWidth / img.naturalHeight;
  const targetRatio = width / height;
  let drawW = width * zoom;
  let drawH = height * zoom;

  if (imgRatio > targetRatio) {
    drawH = height * zoom;
    drawW = drawH * imgRatio;
  } else {
    drawW = width * zoom;
    drawH = drawW / imgRatio;
  }

  const dx = (width - drawW) / 2;
  const dy = (height - drawH) / 2;
  ctx.drawImage(img, dx, dy, drawW, drawH);

  if (circular) {
    ctx.restore();
  }

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return;

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export default function BotBrandStudio() {
  const [selectedId, setSelectedId] = useState<AvatarVariantId>("front");
  const [previewScreen, setPreviewScreen] = useState<PreviewScreen>("chat_list");
  const [tgTheme, setTgTheme] = useState<TelegramTheme>("light");
  const [showSafeZone, setShowSafeZone] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    src: string;
    title: string;
    subtitle: string;
    aspect: "square" | "wide";
    variant?: AvatarVariant;
  } | null>(null);

  const selectedAvatar = AVATAR_VARIANTS.find((v) => v.id === selectedId) ?? AVATAR_VARIANTS[0];

  useEffect(() => {
    if (!lightbox) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightbox]);

  const handleCopy = useCallback(async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch {
      /* fallback ignored */
    }
  }, []);

  const handleDownloadAvatar = useCallback(
    async (variant: AvatarVariant, mode: "square" | "circle") => {
      try {
        setExportStatus(`Подготовка ${variant.title}…`);
        await downloadProcessedImage({
          src: variant.src,
          filename: `${variant.fileSlug}-${mode === "circle" ? "circle-512" : "512x512"}.png`,
          width: 512,
          height: 512,
          circular: mode === "circle",
          zoom: variant.squareZoom,
        });
        setExportStatus(
          mode === "circle" ? "Круглая PNG-иконка 512×512 скачана" : "Квадрат 512×512 для BotFather скачан"
        );
      } catch {
        setExportStatus("Не удалось экспортировать файл");
      } finally {
        window.setTimeout(() => setExportStatus(null), 2600);
      }
    },
    []
  );

  const handleDownloadCover = useCallback(async (resolution: "640x360" | "1280x720") => {
    const [w, h] = resolution === "640x360" ? [640, 360] : [1280, 720];
    try {
      setExportStatus(`Подготовка обложки ${resolution}…`);
      await downloadProcessedImage({
        src: COVER_ASSET.src,
        filename: `${COVER_ASSET.fileSlug}-${resolution}.png`,
        width: w,
        height: h,
      });
      setExportStatus(`Обложка ${resolution} PNG скачана`);
    } catch {
      setExportStatus("Не удалось экспортировать обложку");
    } finally {
      window.setTimeout(() => setExportStatus(null), 2600);
    }
  }, []);

  const isDarkTg = tgTheme === "dark";

  return (
    <div className="container py-8 md:py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-frost-dark hover:text-river transition-colors"
        >
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
          На главную Попутка70
        </Link>
        {exportStatus && (
          <div
            role="status"
            aria-live="polite"
            className="text-xs font-medium text-river bg-river-light px-3 py-1.5 rounded-lg"
          >
            {exportStatus}
          </div>
        )}
      </div>

      <header className="mb-10 max-w-3xl">
        <p className="text-xs font-medium text-frost-dark mb-2">
          Telegram-бот @poputka70_bot · 3D-графика и предпросмотр
        </p>
        <h1 className="text-h1 text-taiga mb-3 text-balance">
          Оформление Telegram-бота «Попутка70»
        </h1>
        <p className="text-body text-frost-dark leading-relaxed max-w-2xl">
          Три варианта современной 3D-аватарки в палитре тёмной тайги со светлыми силуэтами попутчиков,
          обложка для BotFather и живой макет Telegram для проверки читаемости в круглой маске.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Левая колонка: выбор аватарки, обложка, тексты BotFather */}
        <div className="lg:col-span-7 space-y-10">
          {/* Секция 1: 3 варианта аватарки */}
          <section aria-labelledby="avatars-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <h2 id="avatars-heading" className="text-h3 text-taiga">
                1. Варианты аватарки (1:1)
              </h2>
              <span className="text-xs font-utility tabular-nums text-frost-dark">
                512×512 PNG · круглая обрезка в Telegram
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {AVATAR_VARIANTS.map((variant) => {
                const isSelected = variant.id === selectedId;
                return (
                  <article
                    key={variant.id}
                    className={`bg-white rounded-2xl border transition-all duration-200 p-4 flex flex-col ${
                      isSelected
                        ? "border-river ring-2 ring-river/20 shadow-sm"
                        : "border-fog hover:border-fog-dark"
                    }`}
                  >
                    <div className="relative mb-3.5">
                      <button
                        type="button"
                        onClick={() => setSelectedId(variant.id)}
                        className="block w-full aspect-square rounded-full overflow-hidden bg-[#141916] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-river"
                        aria-label={`Выбрать вариант «${variant.title}»`}
                      >
                        <ResilientImage
                          src={variant.src}
                          alt={variant.title}
                          className="w-full h-full object-cover scale-[1.03]"
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setLightbox({
                            src: variant.src,
                            title: variant.title,
                            subtitle: variant.subtitle,
                            aspect: "square",
                            variant,
                          })
                        }
                        className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-white/95 border border-fog text-taiga hover:text-river flex items-center justify-center shadow-xs transition-transform hover:scale-105"
                        aria-label={`Открыть в большом размере: ${variant.title}`}
                      >
                        <Maximize2 className="w-4 h-4" strokeWidth={1.75} aria-hidden="true" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="font-display font-semibold text-base text-taiga leading-snug">
                        {variant.title}
                      </h3>
                    </div>

                    <p className="text-xs text-frost-dark mb-2">
                      {variant.subtitle}
                      {variant.recommended ? " · оптимально для круга" : ""}
                    </p>

                    <p className="text-xs text-frost-dark leading-relaxed mb-4 flex-1">
                      {variant.rationale}
                    </p>

                    <div className="space-y-2 pt-3 border-t border-fog/70">
                      <button
                        type="button"
                        onClick={() => setSelectedId(variant.id)}
                        className={`w-full min-h-[40px] px-3 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                          isSelected
                            ? "bg-river text-white"
                            : "bg-snow text-taiga hover:bg-river-light hover:text-river"
                        }`}
                      >
                        {isSelected ? "Выбрано в превью" : "Примерить в макете"}
                      </button>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => void handleDownloadAvatar(variant, "square")}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-fog text-xs font-medium text-taiga hover:border-river hover:text-river transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                          title="Квадрат 512×512 для загрузки через /setuserpic в BotFather"
                        >
                          <Download className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                          Квадрат
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadAvatar(variant, "circle")}
                          className="min-h-[38px] px-2.5 py-1.5 rounded-xl border border-fog text-xs font-medium text-taiga hover:border-river hover:text-river transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
                          title="PNG с прозрачным фоном в круглой маске"
                        >
                          <Download className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                          Круг PNG
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Секция 2: Обложка бота 16:9 */}
          <section aria-labelledby="cover-heading" className="bg-white border border-fog rounded-2xl p-5 md:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
              <div>
                <h2 id="cover-heading" className="text-h3 text-taiga">
                  2. Обложка блока «Что умеет этот бот?»
                </h2>
                <p className="text-xs text-frost-dark mt-1 font-utility tabular-nums">
                  {COVER_ASSET.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setLightbox({
                    src: COVER_ASSET.src,
                    title: COVER_ASSET.title,
                    subtitle: COVER_ASSET.subtitle,
                    aspect: "wide",
                  })
                }
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-fog text-xs font-medium text-taiga hover:border-river hover:text-river transition-colors whitespace-nowrap"
              >
                <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                Открыть крупно
              </button>
            </div>

            <div className="aspect-video w-full rounded-xl overflow-hidden bg-[#141916] mb-4">
              <ResilientImage
                src={COVER_ASSET.src}
                alt="3D обложка Telegram-бота Попутка70: автомобиль с двумя попутчиками на дороге среди сибирской тайги"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <p className="text-xs text-frost-dark max-w-md leading-relaxed">
                Эта иллюстрация отображается над приветственным текстом при первом открытии бота
                пользователем.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleDownloadCover("640x360")}
                  className="btn-primary px-4 py-2 text-xs min-h-[40px] whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Скачать 640×360 (BotFather)
                </button>
                <button
                  type="button"
                  onClick={() => void handleDownloadCover("1280x720")}
                  className="btn-secondary px-4 py-2 text-xs min-h-[40px] whitespace-nowrap"
                >
                  <Download className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                  1280×720 HD
                </button>
              </div>
            </div>
          </section>

          {/* Секция 3: Готовые тексты для BotFather */}
          <section aria-labelledby="botfather-heading" className="bg-white border border-fog rounded-2xl p-5 md:p-6">
            <div className="mb-5">
              <h2 id="botfather-heading" className="text-h3 text-taiga mb-1">
                3. Настройка в @BotFather за 2 минуты
              </h2>
              <p className="text-sm text-frost-dark">
                Готовые команды и тексты под обновлённое оформление. Загрузи квадрат{" "}
                <span className="font-utility text-taiga">512×512</span> через{" "}
                <span className="font-utility text-taiga">/setuserpic</span> и обложку{" "}
                <span className="font-utility text-taiga">640×360</span> через{" "}
                <span className="font-utility text-taiga">/setdescriptionpic</span>.
              </p>
            </div>

            <div className="divide-y divide-fog">
              {BOTFATHER_FIELDS.map((field) => {
                const copied = copiedKey === field.key;
                return (
                  <div key={field.key} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-taiga">{field.label}</span>
                        <span className="text-xs font-utility text-frost-dark">
                          {field.command} · {field.limit}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleCopy(field.key, field.value)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap min-h-[36px] ${
                          copied
                            ? "bg-river text-white"
                            : "bg-snow text-taiga hover:bg-river-light hover:text-river"
                        }`}
                      >
                        {copied ? (
                          <>
                            <Check className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                            Скопировано
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                            Копировать
                          </>
                        )}
                      </button>
                    </div>
                    <pre className="text-xs sm:text-sm text-frost-dark bg-snow rounded-xl p-3 font-body whitespace-pre-wrap leading-relaxed">
                      {field.value}
                    </pre>
                  </div>
                );
              })}
            </div>
          </section>
        </div>

        {/* Правая колонка: интерактивный симулятор Telegram */}
        <aside className="lg:col-span-5 lg:sticky lg:top-20" aria-label="Симулятор интерфейса Telegram">
          <div className="bg-white border border-fog rounded-2xl p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-display font-semibold text-base text-taiga">
                  Предпросмотр в Telegram
                </h2>
                <p className="text-xs text-frost-dark">Активный вариант: {selectedAvatar.title}</p>
              </div>

              <div className="inline-flex items-center p-1 rounded-xl bg-snow border border-fog/70">
                <button
                  type="button"
                  onClick={() => setTgTheme("light")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    !isDarkTg ? "bg-white text-taiga shadow-xs" : "text-frost-dark hover:text-taiga"
                  }`}
                  aria-label="Светлая тема Telegram"
                >
                  <Sun className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Светлая
                </button>
                <button
                  type="button"
                  onClick={() => setTgTheme("dark")}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    isDarkTg ? "bg-taiga text-white shadow-xs" : "text-frost-dark hover:text-taiga"
                  }`}
                  aria-label="Тёмная тема Telegram"
                >
                  <Moon className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                  Тёмная
                </button>
              </div>
            </div>

            {/* Переключатель экранов симулятора */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-snow border border-fog/70 mb-5">
              {[
                { id: "chat_list" as const, label: "Чаты" },
                { id: "bot_intro" as const, label: "Старт /start" },
                { id: "safe_zone" as const, label: "Маска" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setPreviewScreen(tab.id)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    previewScreen === tab.id
                      ? "bg-white text-river shadow-xs"
                      : "text-frost-dark hover:text-taiga"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Корпус смартфона с макетом Telegram */}
            <div
              className={`mx-auto max-w-[360px] rounded-[28px] border overflow-hidden transition-colors duration-200 ${
                isDarkTg
                  ? "bg-[#17212B] text-[#F5F5F5] border-[#242F3D]"
                  : "bg-white text-[#141916] border-fog"
              }`}
            >
              {/* Верхняя строка статуса */}
              <div
                className={`px-5 pt-3 pb-2 flex items-center justify-between text-[11px] font-utility tabular-nums ${
                  isDarkTg ? "text-white/60" : "text-frost-dark"
                }`}
              >
                <span>18:24</span>
                <span>Telegram · Попутка70</span>
                <span>5G</span>
              </div>

              {previewScreen === "chat_list" && (
                <div>
                  {/* Шапка списка чатов */}
                  <div
                    className={`px-4 py-2.5 flex items-center justify-between border-b ${
                      isDarkTg ? "border-[#232E3C]" : "border-fog/60"
                    }`}
                  >
                    <span className="font-display font-bold text-base">Чаты</span>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center ${
                        isDarkTg ? "bg-[#242F3D] text-white/70" : "bg-snow text-frost-dark"
                      }`}
                    >
                      <Search className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                    </div>
                  </div>

                  {/* Список диалогов */}
                  <div className="divide-y divide-black/5">
                    {MOCK_CHATS.map((chat) => {
                      const isBot = Boolean(chat.isBot);
                      return (
                        <div
                          key={chat.id}
                          className={`px-3.5 py-2.5 flex items-center gap-3 ${
                            isBot
                              ? isDarkTg
                                ? "bg-[#202B36]"
                                : "bg-[#E4EFE7]/45"
                              : ""
                          }`}
                        >
                          {isBot ? (
                            <div
                              className={`w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${
                                isDarkTg ? "ring-1 ring-white/15" : "ring-1 ring-black/10"
                              }`}
                            >
                              <ResilientImage
                                src={selectedAvatar.src}
                                alt={selectedAvatar.title}
                                className="w-full h-full object-cover scale-[1.04]"
                              />
                            </div>
                          ) : (
                            <div
                              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0"
                              style={{ backgroundColor: chat.bg }}
                            >
                              {chat.initials}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-1 min-w-0">
                                <span className="font-semibold text-[13px] truncate">{chat.name}</span>
                                {isBot && (
                                  <ShieldCheck
                                    className={`w-3.5 h-3.5 flex-shrink-0 ${
                                      isDarkTg ? "text-[#6AB2F2]" : "text-river"
                                    }`}
                                    strokeWidth={2}
                                    aria-hidden="true"
                                  />
                                )}
                              </div>
                              <span
                                className={`text-[11px] font-utility tabular-nums flex-shrink-0 ${
                                  isDarkTg ? "text-white/45" : "text-frost-dark"
                                }`}
                              >
                                {chat.time}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p
                                className={`text-xs truncate ${
                                  isDarkTg ? "text-white/65" : "text-frost-dark"
                                }`}
                              >
                                {chat.preview}
                              </p>
                              {chat.unread > 0 && (
                                <span
                                  className={`min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-utility font-semibold flex items-center justify-center ${
                                    isDarkTg ? "bg-[#5288C1] text-white" : "bg-river text-white"
                                  }`}
                                >
                                  {chat.unread}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {previewScreen === "bot_intro" && (
                <div>
                  {/* Шапка диалога с ботом */}
                  <div
                    className={`px-4 py-2.5 flex items-center gap-3 border-b ${
                      isDarkTg ? "bg-[#212D3B] border-[#101921]" : "bg-white border-fog/70"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full overflow-hidden flex-shrink-0 ${
                        isDarkTg ? "ring-1 ring-white/15" : "ring-1 ring-black/10"
                      }`}
                    >
                      <ResilientImage
                        src={selectedAvatar.src}
                        alt={selectedAvatar.title}
                        className="w-full h-full object-cover scale-[1.04]"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm leading-tight truncate">Попутка70</div>
                      <div className={`text-[11px] ${isDarkTg ? "text-white/55" : "text-frost-dark"}`}>
                        бот
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-river text-white">
                      Открыть
                    </span>
                  </div>

                  {/* Холст чата с карточкой «Что умеет этот бот?» */}
                  <div
                    className={`p-4 min-h-[340px] flex flex-col justify-between ${
                      isDarkTg
                        ? "bg-[#0E1621]"
                        : "bg-gradient-to-b from-[#EAEFE6] to-[#DDE6D8]"
                    }`}
                  >
                    <div
                      className={`rounded-2xl overflow-hidden border shadow-xs ${
                        isDarkTg
                          ? "bg-[#182533] border-[#243242]"
                          : "bg-white border-fog"
                      }`}
                    >
                      <div className="aspect-video w-full bg-[#141916]">
                        <ResilientImage
                          src={COVER_ASSET.src}
                          alt="Обложка Попутка70"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-3.5">
                        <div className="font-semibold text-xs mb-1.5">Что умеет этот бот?</div>
                        <p
                          className={`text-xs leading-relaxed ${
                            isDarkTg ? "text-white/80" : "text-frost-dark"
                          }`}
                        >
                          Поиск и публикация поездок по Томску и пригороду без комиссии.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div
                          className={`text-center py-2 px-2 rounded-lg text-[11px] font-medium ${
                            isDarkTg ? "bg-[#2B5278] text-white" : "bg-white/90 text-taiga"
                          }`}
                        >
                          Найти поездку
                        </div>
                        <div
                          className={`text-center py-2 px-2 rounded-lg text-[11px] font-medium ${
                            isDarkTg ? "bg-[#2B5278] text-white" : "bg-white/90 text-taiga"
                          }`}
                        >
                          Опубликовать
                        </div>
                      </div>
                      <div
                        className={`rounded-xl py-2.5 px-4 text-center text-xs font-semibold flex items-center justify-center gap-1.5 ${
                          isDarkTg ? "bg-[#5288C1] text-white" : "bg-river text-white"
                        }`}
                      >
                        <Send className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                        ЗАПУСТИТЬ
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {previewScreen === "safe_zone" && (
                <div className="p-5 space-y-5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium">Проверка круглой обрезки</span>
                    <button
                      type="button"
                      onClick={() => setShowSafeZone((v) => !v)}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                        isDarkTg
                          ? "border-white/20 text-white/80 hover:bg-white/10"
                          : "border-fog text-taiga hover:bg-snow"
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                      {showSafeZone ? "Скрыть сетку" : "Показать сетку"}
                    </button>
                  </div>

                  {/* Большой круг с опциональной сеткой */}
                  <div className="flex justify-center">
                    <div className="relative w-44 h-44 rounded-2xl overflow-hidden bg-[#141916] border border-fog/20">
                      <ResilientImage
                        src={selectedAvatar.src}
                        alt={selectedAvatar.title}
                        className="w-full h-full object-cover scale-[1.03]"
                      />
                      {showSafeZone && (
                        <>
                          {/* Граница круглой маски Telegram */}
                          <div
                            className="absolute inset-0 rounded-full border-2 border-dashed border-white/80 pointer-events-none"
                            aria-hidden="true"
                          />
                          {/* Внутренняя безопасная зона (80%) */}
                          <div
                            className="absolute inset-[10%] rounded-full border border-birch-light/90 pointer-events-none"
                            aria-hidden="true"
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Три реальных размера в интерфейсе */}
                  <div
                    className={`rounded-xl p-3.5 flex items-end justify-around gap-3 ${
                      isDarkTg ? "bg-[#202B36]" : "bg-snow"
                    }`}
                  >
                    {[
                      { size: 40, label: "40px · Чат" },
                      { size: 56, label: "56px · Список" },
                      { size: 84, label: "84px · Профиль" },
                    ].map((item) => (
                      <div key={item.size} className="flex flex-col items-center gap-2">
                        <div
                          className={`rounded-full overflow-hidden ${
                            isDarkTg ? "ring-1 ring-white/15" : "ring-1 ring-black/10"
                          }`}
                          style={{ width: item.size, height: item.size }}
                        >
                          <ResilientImage
                            src={selectedAvatar.src}
                            alt={`${selectedAvatar.title} ${item.label}`}
                            className="w-full h-full object-cover scale-[1.04]"
                          />
                        </div>
                        <span
                          className={`text-[10px] font-utility tabular-nums ${
                            isDarkTg ? "text-white/60" : "text-frost-dark"
                          }`}
                        >
                          {item.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-fog/70 flex items-center justify-between gap-3">
              <span className="text-xs text-frost-dark">
                Палитра: <span className="font-utility text-taiga">#141916 · #F4F5F1 · #D08A3E</span>
              </span>
              <button
                type="button"
                onClick={() => void handleDownloadAvatar(selectedAvatar, "square")}
                className="text-xs font-semibold text-river hover:underline inline-flex items-center gap-1 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
                Скачать выбранную
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Полноэкранный лайтбокс просмотра */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-taiga/85 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={lightbox.title}
          onClick={() => setLightbox(null)}
        >
          <div
            className="bg-white rounded-2xl border border-fog max-w-2xl w-full overflow-hidden shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-fog flex items-center justify-between gap-4">
              <div>
                <h3 className="font-display font-bold text-lg text-taiga">{lightbox.title}</h3>
                <p className="text-xs text-frost-dark font-utility">{lightbox.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setLightbox(null)}
                className="w-10 h-10 rounded-xl bg-snow hover:bg-fog text-taiga flex items-center justify-center transition-colors"
                aria-label="Закрыть просмотр"
              >
                <X className="w-5 h-5" strokeWidth={1.75} aria-hidden="true" />
              </button>
            </div>

            <div className="bg-[#141916] p-6 flex items-center justify-center">
              <div
                className={`overflow-hidden rounded-2xl ${
                  lightbox.aspect === "square" ? "w-full max-w-[420px] aspect-square" : "w-full aspect-video"
                }`}
              >
                <ResilientImage
                  src={lightbox.src}
                  alt={lightbox.title}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              {lightbox.variant ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(lightbox.variant!.id);
                      setLightbox(null);
                    }}
                    className="btn-secondary px-4 py-2 text-xs min-h-[40px]"
                  >
                    Выбрать в симуляторе
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleDownloadAvatar(lightbox.variant!, "circle")}
                      className="btn-secondary px-4 py-2 text-xs min-h-[40px]"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Круг PNG
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDownloadAvatar(lightbox.variant!, "square")}
                      className="btn-primary px-4 py-2 text-xs min-h-[40px]"
                    >
                      <Download className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                      Скачать 512×512
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <span className="text-xs text-frost-dark">Обложка приветственного экрана бота</span>
                  <button
                    type="button"
                    onClick={() => void handleDownloadCover("640x360")}
                    className="btn-primary px-4 py-2 text-xs min-h-[40px]"
                  >
                    <Download className="w-3.5 h-3.5" strokeWidth={1.75} aria-hidden="true" />
                    Скачать 640×360 PNG
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
