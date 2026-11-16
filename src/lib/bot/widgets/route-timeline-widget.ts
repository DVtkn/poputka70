import { prisma } from "@/lib/prisma";
import { tripRoute } from "@/lib/trips";
import { formatTripDateTomsk, formatTomskTimeOnly } from "../formatters";
import { sendWidget } from "../telegram-client";
import { segmentLengthKm } from "@/lib/geo";
import type {
  SendWidgetOptions,
  SendWidgetResult,
  TelegramChatId,
  TelegramInlineKeyboardMarkup,
} from "../types";

export interface TimelineStopInfo {
  index: number;
  name: string;
  type: "origin" | "stop" | "dest";
  timeEstimate: string;
  distanceKm: number;
  description?: string;
  lat?: number | null;
  lng?: number | null;
}

export interface RouteTimelineWidgetParams {
  tripId: string;
  originName: string;
  destName: string;
  departureTimeTomsk: string;
  totalDistanceKm: number;
  estimatedDurationMinutes: number;
  stops: TimelineStopInfo[];
  appUrl: string;
}

/**
 * Генерирует изолированный HTML интерактивного таймлайна остановок (<32KB).
 * Поддерживает клики по остановкам, просмотр информации и выбор точки через Telegram.sendData.
 */
export function renderRouteTimelineWidgetHtml(params: RouteTimelineWidgetParams): string {
  const safeStopsJson = JSON.stringify({
    tripId: params.tripId,
    stops: params.stops,
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Маршрут поездки · Попутка70</title>
<style>
  :root {
    --bg: #0F172A;
    --card: #1E293B;
    --card-border: #334155;
    --text: #F8FAFC;
    --muted: #94A3B8;
    --taiga: #10B981;
    --taiga-hover: #059669;
    --river: #38BDF8;
    --origin: #10B981;
    --dest: #F59E0B;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background: var(--bg); color: var(--text); padding: 12px; font-size: 14px; user-select: none; }
  .widget-card { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 14px; max-width: 360px; margin: 0 auto; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .header { border-bottom: 1px solid var(--card-border); padding-bottom: 10px; margin-bottom: 14px; }
  .route-title { font-size: 15px; font-weight: 700; color: var(--text); }
  .meta { font-size: 12px; color: var(--muted); margin-top: 4px; display: flex; justify-content: space-between; }

  /* Timeline */
  .timeline { position: relative; padding: 8px 0 8px 24px; }
  .timeline::before {
    content: '';
    position: absolute;
    top: 18px;
    bottom: 24px;
    left: 7px;
    width: 2px;
    background: linear-gradient(to bottom, var(--taiga), var(--river), var(--dest));
    border-radius: 1px;
  }
  .stop-item {
    position: relative;
    padding-bottom: 18px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .stop-item:last-child { padding-bottom: 4px; }
  .node-dot {
    position: absolute;
    left: -24px;
    top: 2px;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--card);
    border: 3px solid var(--muted);
    transition: all 0.2s ease;
  }
  .stop-item.origin .node-dot { border-color: var(--origin); background: rgba(16,185,129,0.3); }
  .stop-item.dest .node-dot { border-color: var(--dest); background: rgba(245,158,11,0.3); }
  .stop-item.selected .node-dot {
    transform: scale(1.3);
    border-color: var(--river);
    background: var(--river);
    box-shadow: 0 0 10px var(--river);
  }
  .stop-card {
    background: rgba(15,23,42,0.6);
    border: 1px solid transparent;
    border-radius: 10px;
    padding: 8px 10px;
    transition: all 0.2s ease;
  }
  .stop-item.selected .stop-card {
    border-color: var(--river);
    background: rgba(56,189,248,0.1);
  }
  .stop-item:hover .stop-card {
    border-color: var(--card-border);
  }
  .stop-name { font-weight: 600; font-size: 13px; color: var(--text); }
  .stop-info { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin-top: 3px; }

  /* Stop Detail Drawer */
  .drawer {
    margin-top: 10px;
    padding: 10px;
    border-radius: 12px;
    background: #0B1120;
    border: 1px solid var(--card-border);
    display: none;
  }
  .drawer.open { display: block; }
  .drawer-title { font-weight: 700; font-size: 13px; color: var(--river); margin-bottom: 4px; }
  .drawer-meta { font-size: 12px; color: var(--muted); margin-bottom: 8px; }
  .drawer-btns { display: flex; gap: 8px; }
  .btn-sm {
    flex: 1;
    background: var(--taiga);
    color: #064E3B;
    border: none;
    border-radius: 8px;
    padding: 8px 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: center;
  }
  .btn-sm:hover { background: var(--taiga-hover); color: #fff; }
  .btn-secondary {
    background: #334155;
    color: var(--text);
  }
  .btn-secondary:hover { background: #475569; }

  .status-msg {
    text-align: center;
    font-size: 11px;
    color: var(--muted);
    margin-top: 10px;
  }
</style>
</head>
<body>
<div class="widget-card">
  <div class="header">
    <div class="route-title">${escapeHtml(params.originName)} → ${escapeHtml(params.destName)}</div>
    <div class="meta">
      <span>🕒 ${escapeHtml(params.departureTimeTomsk)}</span>
      <span>📍 ${params.totalDistanceKm} км · ~${params.estimatedDurationMinutes} мин</span>
    </div>
  </div>

  <div class="timeline" id="timeline"></div>

  <div class="drawer" id="drawer">
    <div class="drawer-title" id="drawer-title"></div>
    <div class="drawer-meta" id="drawer-meta"></div>
    <div class="drawer-btns">
      <button class="btn-sm" id="btn-pickup">📍 Посадка здесь</button>
      <button class="btn-sm btn-secondary" id="btn-dropoff">🏁 Высадка здесь</button>
    </div>
  </div>

  <div class="status-msg" id="status-msg">Нажмите на остановку, чтобы выбрать точку посадки/высадки</div>
</div>

<script>
(function() {
  var data = ${safeStopsJson};
  var activeStop = null;

  function renderTimeline() {
    var container = document.getElementById('timeline');
    container.innerHTML = '';

    data.stops.forEach(function(stop) {
      var item = document.createElement('div');
      item.className = 'stop-item ' + stop.type + (activeStop === stop.index ? ' selected' : '');
      item.onclick = function() {
        selectStop(stop);
      };

      var dot = document.createElement('div');
      dot.className = 'node-dot';
      item.appendChild(dot);

      var card = document.createElement('div');
      card.className = 'stop-card';

      var badge = stop.type === 'origin' ? '🏁 Отправление' : (stop.type === 'dest' ? '🏁 Прибытие' : 'Остановка');
      card.innerHTML = '<div class="stop-name">' + escapeHtml(stop.name) + '</div>' +
        '<div class="stop-info">' +
          '<span>' + badge + '</span>' +
          '<span>' + stop.timeEstimate + (stop.distanceKm > 0 ? ' · ' + stop.distanceKm + ' км' : '') + '</span>' +
        '</div>';

      item.appendChild(card);
      container.appendChild(item);
    });
  }

  function selectStop(stop) {
    activeStop = stop.index;
    renderTimeline();

    var drawer = document.getElementById('drawer');
    drawer.className = 'drawer open';
    document.getElementById('drawer-title').innerText = stop.name;
    document.getElementById('drawer-meta').innerText = 'Расчетное время: ' + stop.timeEstimate + ' (' + stop.distanceKm + ' км от старта)';

    document.getElementById('btn-pickup').onclick = function() {
      sendStopChoice(stop, 'pickup');
    };
    document.getElementById('btn-dropoff').onclick = function() {
      sendStopChoice(stop, 'dropoff');
    };
  }

  function sendStopChoice(stop, type) {
    var label = type === 'pickup' ? 'посадки' : 'высадки';
    document.getElementById('status-msg').innerText = 'Выбрана точка ' + label + ': ' + stop.name;

    var payload = JSON.stringify({
      action: 'select_stop',
      tripId: data.tripId,
      stopIndex: stop.index,
      stopName: stop.name,
      type: type
    });

    if (window.Telegram && window.Telegram.WebApp && typeof window.Telegram.WebApp.sendData === 'function') {
      window.Telegram.WebApp.sendData(payload);
    } else if (window.Telegram && typeof window.Telegram.sendData === 'function') {
      window.Telegram.sendData(payload);
    } else if (window.TelegramWebviewProxy && typeof window.TelegramWebviewProxy.postEvent === 'function') {
      window.TelegramWebviewProxy.postEvent('web_app_send_data', payload);
    } else if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'widget_query', data: payload }, '*');
    }
  }

  // Реактивное обновление состояния виджета из editMessageWidgetData
  window.onTelegramWidgetData = function(newData) {
    try {
      var parsed = typeof newData === 'string' ? JSON.parse(newData) : newData;
      if (parsed.stopName && parsed.type) {
        var label = parsed.type === 'pickup' ? 'посадки' : 'высадки';
        var sb = document.getElementById('status-msg');
        if (sb) sb.innerText = '✅ Точка ' + label + ' зафиксирована: ' + parsed.stopName;
      }
    } catch(e) {
      console.error(e);
    }
  };

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  renderTimeline();
})();
</script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Загружает из Prisma данные о маршруте и остановках поездки для таймлайн-виджета.
 */
export async function buildRouteTimelineData(
  tripId: string
): Promise<RouteTimelineWidgetParams | null> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://poputka70.vercel.app";

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
    },
  });

  if (!trip) return null;

  const route = tripRoute(trip);
  const originName = route?.originName || trip.originName || "Томск";
  const destName = route?.destName || trip.destName || "Северск";
  const originCoord = route?.origin || { lat: trip.originLat ?? 56.4977, lng: trip.originLng ?? 84.9744 };
  const destCoord = route?.dest || { lat: trip.destLat ?? 56.5986, lng: trip.destLng ?? 84.8864 };

  const totalDistanceKm = Math.max(1, Math.round(segmentLengthKm(originCoord, destCoord) * 10) / 10);
  const estimatedDurationMinutes = Math.max(10, Math.round((totalDistanceKm / 40) * 60)); // ~40 км/ч средняя скорость по городу

  const departureTimeTomsk = formatTripDateTomsk(trip.departureTime);
  const originTimeStr = formatTomskTimeOnly(trip.departureTime);

  // Извлекаем промежуточные остановки из routeStops
  const rawStops = Array.isArray(trip.routeStops)
    ? (trip.routeStops as unknown as Array<{ name: string; lat?: number | null; lng?: number | null }>)
    : [];

  const stops: TimelineStopInfo[] = [];

  // Начальная точка
  stops.push({
    index: 0,
    name: originName,
    type: "origin",
    timeEstimate: originTimeStr,
    distanceKm: 0,
    lat: originCoord.lat,
    lng: originCoord.lng,
  });

  // Промежуточные остановки
  if (rawStops.length > 2) {
    const intermediates = rawStops.slice(1, -1);
    intermediates.forEach((s, idx) => {
      const fraction = (idx + 1) / (intermediates.length + 1);
      const stopDist = Math.round(totalDistanceKm * fraction * 10) / 10;
      const stopMinutes = Math.round(estimatedDurationMinutes * fraction);
      const estTime = new Date(trip.departureTime.getTime() + stopMinutes * 60 * 1000);

      stops.push({
        index: idx + 1,
        name: s.name,
        type: "stop",
        timeEstimate: `${formatTomskTimeOnly(estTime)} (+${stopMinutes} мин)`,
        distanceKm: stopDist,
        lat: s.lat,
        lng: s.lng,
      });
    });
  }

  // Конечная точка
  const finalTime = new Date(trip.departureTime.getTime() + estimatedDurationMinutes * 60 * 1000);
  stops.push({
    index: stops.length,
    name: destName,
    type: "dest",
    timeEstimate: `${formatTomskTimeOnly(finalTime)} (+${estimatedDurationMinutes} мин)`,
    distanceKm: totalDistanceKm,
    lat: destCoord.lat,
    lng: destCoord.lng,
  });

  return {
    tripId: trip.id,
    originName,
    destName,
    departureTimeTomsk,
    totalDistanceKm,
    estimatedDurationMinutes,
    stops,
    appUrl,
  };
}

export function buildRouteTimelineFallbackMarkup(
  tripId: string,
  appUrl: string
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "🗺 Открыть карту маршрута",
          web_app: { url: `${appUrl}/trips/${encodeURIComponent(tripId)}` },
        },
      ],
      [{ text: "🏠 Главное меню", callback_data: "m:main" }],
    ],
  };
}

/**
 * Отправка интерактивного виджета таймлайна маршрута в чат Telegram.
 */
export async function sendRouteTimelineWidget(
  chatId: TelegramChatId,
  tripId: string
): Promise<SendWidgetResult> {
  const data = await buildRouteTimelineData(tripId);
  if (!data) {
    return { ok: false, error: "Trip not found" };
  }

  const widgetHtml = renderRouteTimelineWidgetHtml(data);
  const fallbackMarkup = buildRouteTimelineFallbackMarkup(tripId, data.appUrl);
  const stopsList = data.stops.map((s) => `• ${escapeHtml(s.name)} (${s.timeEstimate})`).join("\n");
  const fallbackText = `🗺 <b>Маршрут: ${escapeHtml(data.originName)} → ${escapeHtml(data.destName)}</b>\n🕒 Отправление: ${escapeHtml(data.departureTimeTomsk)}\n📍 Дистанция: ${data.totalDistanceKm} км (~${data.estimatedDurationMinutes} мин)\n\n<b>Остановки:</b>\n${stopsList}`;

  const options: SendWidgetOptions = {
    caption: `Маршрут: ${data.originName} → ${data.destName}`,
    reply_markup: fallbackMarkup,
    data: {
      tripId: data.tripId,
      stops: data.stops,
    },
    fallbackText,
  };

  return await sendWidget(chatId, widgetHtml, options);
}
