import { prisma } from "@/lib/prisma";
import { tripRoute } from "@/lib/trips";
import { formatTripDateTomsk } from "../formatters";
import { sendWidget } from "../telegram-client";
import type {
  SendWidgetOptions,
  SendWidgetResult,
  TelegramChatId,
  TelegramInlineKeyboardMarkup,
} from "../types";

export interface SeatInfo {
  seatNumber: number;
  label: string;
  status: "free" | "occupied" | "my_seat";
  passengerName?: string;
}

export interface SeatMapWidgetParams {
  tripId: string;
  originName: string;
  destName: string;
  departureTimeTomsk: string;
  price: number;
  carModel?: string | null;
  seatsTotal: number;
  seatsLeft: number;
  seats: SeatInfo[];
  userBookingSeatNumber?: number | null;
  appUrl: string;
}

/**
 * Генерирует изолированный, самодостаточный HTML микро-виджета выбора мест (<32KB).
 * Без внешних сетевых запросов, с inline CSS/JS и обработкой Telegram.sendData.
 */
export function renderSeatMapWidgetHtml(params: SeatMapWidgetParams): string {
  const safeDataJson = JSON.stringify({
    tripId: params.tripId,
    price: params.price,
    seatsTotal: params.seatsTotal,
    seats: params.seats,
    userBookingSeatNumber: params.userBookingSeatNumber,
  }).replace(/</g, "\\u003c");

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<title>Выбор места · Попутка70</title>
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
    --danger: #EF4444;
    --occupied: #475569;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  body { background: var(--bg); color: var(--text); padding: 12px; font-size: 14px; user-select: none; }
  .widget-card { background: var(--card); border: 1px solid var(--card-border); border-radius: 16px; padding: 14px; max-width: 360px; margin: 0 auto; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; border-bottom: 1px solid var(--card-border); padding-bottom: 10px; }
  .route { font-size: 15px; font-weight: 700; color: var(--text); }
  .meta { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .price-tag { background: rgba(16,185,129,0.15); color: var(--taiga); font-weight: 700; font-size: 14px; padding: 4px 8px; border-radius: 8px; }

  /* Car Cabin Layout */
  .car-cabin {
    background: #0B1120;
    border: 2px solid var(--card-border);
    border-radius: 28px 28px 18px 18px;
    padding: 16px 14px;
    margin: 12px 0;
    position: relative;
  }
  .windshield {
    height: 8px;
    background: rgba(56,189,248,0.25);
    border-radius: 4px;
    margin-bottom: 14px;
    box-shadow: 0 0 8px rgba(56,189,248,0.2);
  }
  .seat-row { display: flex; justify-content: space-around; gap: 12px; margin-bottom: 12px; }
  .seat-row:last-child { margin-bottom: 0; }
  .seat {
    flex: 1;
    min-height: 58px;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    transition: all 0.2s ease;
    cursor: pointer;
    padding: 6px 4px;
    text-align: center;
  }
  .seat-driver {
    background: #1E293B;
    border-color: #334155;
    color: var(--muted);
    cursor: default;
    opacity: 0.8;
  }
  .seat.free {
    background: rgba(16,185,129,0.1);
    border-color: var(--taiga);
    color: var(--text);
  }
  .seat.free:hover, .seat.free:active {
    background: rgba(16,185,129,0.25);
    transform: translateY(-2px);
  }
  .seat.selected {
    background: var(--taiga);
    border-color: #34D399;
    color: #064E3B;
    font-weight: 700;
    box-shadow: 0 0 12px rgba(16,185,129,0.5);
    transform: translateY(-2px);
  }
  .seat.occupied {
    background: rgba(71,85,105,0.3);
    border-color: var(--occupied);
    color: #64748B;
    cursor: not-allowed;
  }
  .seat.my-seat {
    background: rgba(56,189,248,0.2);
    border-color: var(--river);
    color: var(--river);
    font-weight: 700;
  }
  .seat-num { font-size: 13px; font-weight: 700; }
  .seat-sub { font-size: 10px; margin-top: 2px; }

  /* Legend */
  .legend { display: flex; justify-content: space-between; font-size: 11px; color: var(--muted); margin: 10px 0; }
  .legend-item { display: flex; align-items: center; gap: 4px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; }
  .dot-free { background: var(--taiga); }
  .dot-occ { background: var(--occupied); }
  .dot-my { background: var(--river); }

  /* CTA Button */
  .action-btn {
    width: 100%;
    background: var(--taiga);
    color: #064E3B;
    border: none;
    border-radius: 12px;
    padding: 12px;
    font-size: 14px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: 4px;
  }
  .action-btn:disabled {
    background: #334155;
    color: #64748B;
    cursor: not-allowed;
  }
  .action-btn:not(:disabled):hover {
    background: var(--taiga-hover);
    color: #FFFFFF;
  }
  .status-bar {
    font-size: 12px;
    text-align: center;
    color: var(--muted);
    margin-top: 8px;
    min-height: 18px;
  }
</style>
</head>
<body>
<div class="widget-card">
  <div class="header">
    <div>
      <div class="route">${escapeHtml(params.originName)} → ${escapeHtml(params.destName)}</div>
      <div class="meta">${escapeHtml(params.departureTimeTomsk)}${params.carModel ? " · " + escapeHtml(params.carModel) : ""}</div>
    </div>
    <div class="price-tag">${params.price} ₽</div>
  </div>

  <div class="car-cabin">
    <div class="windshield"></div>
    <div class="seat-row" id="front-row"></div>
    <div class="seat-row" id="rear-row"></div>
  </div>

  <div class="legend">
    <div class="legend-item"><span class="dot dot-free"></span> Свободно</div>
    <div class="legend-item"><span class="dot dot-my"></span> Ваше место</div>
    <div class="legend-item"><span class="dot dot-occ"></span> Занято</div>
  </div>

  <button class="action-btn" id="book-btn" disabled>Выберите свободное место</button>
  <div class="status-bar" id="status-bar">Осталось мест: ${params.seatsLeft} из ${params.seatsTotal}</div>
</div>

<script>
(function() {
  var state = ${safeDataJson};
  var selectedSeat = null;

  function renderSeats() {
    var frontRow = document.getElementById('front-row');
    var rearRow = document.getElementById('rear-row');
    frontRow.innerHTML = '';
    rearRow.innerHTML = '';

    // Driver Seat
    var driverEl = document.createElement('div');
    driverEl.className = 'seat seat-driver';
    driverEl.innerHTML = '<span class="seat-num">🚙</span><span class="seat-sub">Водитель</span>';
    frontRow.appendChild(driverEl);

    // Front Passenger (Seat 1)
    var seat1 = state.seats[0];
    if (seat1) {
      frontRow.appendChild(createSeatElement(seat1));
    }

    // Rear Passengers (Seats 2..N)
    for (var i = 1; i < state.seats.length; i++) {
      rearRow.appendChild(createSeatElement(state.seats[i]));
    }
    updateButton();
  }

  function createSeatElement(seat) {
    var el = document.createElement('div');
    var isSelected = selectedSeat === seat.seatNumber;
    var statusClass = isSelected ? 'selected' : (seat.status === 'my_seat' ? 'my-seat' : seat.status);
    el.className = 'seat ' + statusClass;
    el.dataset.seatNumber = seat.seatNumber;

    var label = seat.status === 'my_seat' ? 'Вы' : (seat.status === 'occupied' ? 'Занято' : (isSelected ? 'Выбрано' : 'Свободно'));
    el.innerHTML = '<span class="seat-num">Место ' + seat.seatNumber + '</span><span class="seat-sub">' + label + '</span>';

    if (seat.status === 'free') {
      el.onclick = function() {
        if (selectedSeat === seat.seatNumber) {
          selectedSeat = null;
        } else {
          selectedSeat = seat.seatNumber;
        }
        renderSeats();
      };
    } else if (seat.status === 'my_seat') {
      el.onclick = function() {
        setStatus('Вы уже забронировали это место');
      };
    }
    return el;
  }

  function updateButton() {
    var btn = document.getElementById('book-btn');
    if (state.userBookingSeatNumber) {
      btn.disabled = true;
      btn.innerText = 'Место уже забронировано (№' + state.userBookingSeatNumber + ')';
    } else if (selectedSeat) {
      btn.disabled = false;
      btn.innerText = 'Занять место №' + selectedSeat + ' (' + state.price + ' ₽)';
    } else {
      btn.disabled = true;
      btn.innerText = 'Выберите свободное место';
    }
  }

  function setStatus(msg) {
    var sb = document.getElementById('status-bar');
    if (sb) sb.innerText = msg;
  }

  document.getElementById('book-btn').onclick = function() {
    if (!selectedSeat) return;
    var payload = JSON.stringify({
      action: 'select_seat',
      tripId: state.tripId,
      seatNumber: selectedSeat
    });

    setStatus('Бронирование места №' + selectedSeat + '...');

    // Bot API 10.4 Widget / Telegram WebApp bridge
    if (window.Telegram && window.Telegram.sendData) {
      window.Telegram.sendData(payload);
    } else if (window.TelegramWebviewProxy) {
      window.TelegramWebviewProxy.postEvent('web_app_send_data', payload);
    } else if (window.parent) {
      window.parent.postMessage({ type: 'widget_query', data: payload }, '*');
    }
  };

  // Реактивное обновление состояния виджета из editMessageWidgetData
  window.onTelegramWidgetData = function(newData) {
    try {
      var parsed = typeof newData === 'string' ? JSON.parse(newData) : newData;
      if (parsed.seats) state.seats = parsed.seats;
      if (parsed.userBookingSeatNumber !== undefined) state.userBookingSeatNumber = parsed.userBookingSeatNumber;
      selectedSeat = null;
      renderSeats();
      setStatus('Данные мест обновлены');
    } catch(e) {
      console.error(e);
    }
  };

  renderSeats();
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
 * Загружает из Prisma данные о поездке и забронированных местах для Seat Map виджета.
 */
export async function buildSeatMapData(
  tripId: string,
  currentUserId?: string
): Promise<SeatMapWidgetParams | null> {
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
      driver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          driverProfile: { select: { carModel: true } },
        },
      },
      bookings: {
        where: { status: { in: ["PENDING", "CONFIRMED"] } },
        select: {
          id: true,
          passengerId: true,
          note: true,
          status: true,
          passenger: { select: { firstName: true } },
        },
      },
    },
  });

  if (!trip) return null;

  const route = tripRoute(trip);
  const originName = route?.originName || trip.originName || "Томск";
  const destName = route?.destName || trip.destName || "Томск";
  const seatsTotal = Math.max(1, Math.min(8, route?.seatsTotal ?? trip.seatsTotal ?? 4));
  const price = route?.price ?? trip.price ?? 0;
  const departureTimeTomsk = formatTripDateTomsk(trip.departureTime);

  // Карта занятых мест: проверяем note на "Место X" или назначаем по порядку
  const assignedSeats = new Map<number, { status: "occupied" | "my_seat"; name: string }>();
  let userBookingSeatNumber: number | null = null;

  trip.bookings.forEach((b) => {
    let seatNum: number | null = null;
    if (b.note) {
      const match = b.note.match(/Место\s*(\d+)/i);
      if (match && match[1]) {
        seatNum = parseInt(match[1], 10);
      }
    }
    if (!seatNum || seatNum < 1 || seatNum > seatsTotal || assignedSeats.has(seatNum)) {
      for (let s = 1; s <= seatsTotal; s++) {
        if (!assignedSeats.has(s)) {
          seatNum = s;
          break;
        }
      }
    }
    if (seatNum) {
      const isMySeat = currentUserId ? b.passengerId === currentUserId : false;
      if (isMySeat) userBookingSeatNumber = seatNum;
      assignedSeats.set(seatNum, {
        status: isMySeat ? "my_seat" : "occupied",
        name: b.passenger.firstName,
      });
    }
  });

  const seats: SeatInfo[] = [];
  for (let s = 1; s <= seatsTotal; s++) {
    const assigned = assignedSeats.get(s);
    if (assigned) {
      seats.push({
        seatNumber: s,
        label: `Место ${s}`,
        status: assigned.status,
        passengerName: assigned.name,
      });
    } else {
      seats.push({
        seatNumber: s,
        label: `Место ${s}`,
        status: "free",
      });
    }
  }

  const seatsLeft = seats.filter((s) => s.status === "free").length;

  return {
    tripId: trip.id,
    originName,
    destName,
    departureTimeTomsk,
    price,
    carModel: trip.driver?.driverProfile?.carModel ?? null,
    seatsTotal,
    seatsLeft,
    seats,
    userBookingSeatNumber,
    appUrl,
  };
}

export function buildSeatMapFallbackMarkup(
  tripId: string,
  appUrl: string
): TelegramInlineKeyboardMarkup {
  return {
    inline_keyboard: [
      [
        {
          text: "💺 Забронировать место в Mini App",
          web_app: { url: `${appUrl}/trips/${encodeURIComponent(tripId)}` },
        },
      ],
      [{ text: "🏠 Главное меню", callback_data: "m:main" }],
    ],
  };
}

/**
 * Отправка интерактивного виджета схемы мест в чат Telegram.
 * Если Bot API не поддерживает sendWidget или клиент устарел, сработает автоматический фоллбэк.
 */
export async function sendSeatMapWidget(
  chatId: TelegramChatId,
  tripId: string,
  currentUserId?: string
): Promise<SendWidgetResult> {
  const data = await buildSeatMapData(tripId, currentUserId);
  if (!data) {
    return { ok: false, error: "Trip not found" };
  }

  const widgetHtml = renderSeatMapWidgetHtml(data);
  const fallbackMarkup = buildSeatMapFallbackMarkup(tripId, data.appUrl);
  const fallbackText = `🚗 <b>Выбор мест: ${escapeHtml(data.originName)} → ${escapeHtml(data.destName)}</b>\n🕒 ${escapeHtml(data.departureTimeTomsk)}\n💰 ${data.price} ₽ · Свободно: ${data.seatsLeft} из ${data.seatsTotal} мест`;

  const options: SendWidgetOptions = {
    caption: `Схема мест: ${data.originName} → ${data.destName}`,
    reply_markup: fallbackMarkup,
    data: {
      tripId: data.tripId,
      seats: data.seats,
      userBookingSeatNumber: data.userBookingSeatNumber,
    },
    fallbackText,
  };

  return await sendWidget(chatId, widgetHtml, options);
}
