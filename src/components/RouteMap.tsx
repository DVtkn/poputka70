"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Map as MapIcon,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

export interface RoutePoint {
  name: string;
  lat: number | null;
  lng: number | null;
  address?: string | null;
}

interface RouteMapProps {
  points: RoutePoint[];
  originName: string;
  destName: string;
}

// Проекция Web Mercator
function latLngToMercator(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom);
  const x = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  return { x, y };
}

export default function RouteMap({ points, originName, destName }: RouteMapProps) {
  const [viewMode, setViewMode] = useState<"osm" | "schema">("osm");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeStop, setActiveStop] = useState<{ name: string; index: number; x: number; y: number } | null>(null);

  // Фильтруем точки с валидными координатами
  const validPoints = useMemo(() => {
    return points.filter(
      (p): p is { name: string; lat: number; lng: number; address?: string | null } =>
        typeof p.lat === "number" && typeof p.lng === "number" && !isNaN(p.lat) && !isNaN(p.lng)
    );
  }, [points]);

  // Вычисляем границы (bounding box)
  const bounds = useMemo(() => {
    if (validPoints.length === 0) return null;
    let minLat = validPoints[0].lat;
    let maxLat = validPoints[0].lat;
    let minLng = validPoints[0].lng;
    let maxLng = validPoints[0].lng;

    for (const p of validPoints) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lng < minLng) minLng = p.lng;
      if (p.lng > maxLng) maxLng = p.lng;
    }

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const spanLat = Math.max(0.015, maxLat - minLat);
    const spanLng = Math.max(0.015, maxLng - minLng);

    // Подбираем оптимальный зум
    const maxSpan = Math.max(spanLat * 1.4, spanLng);
    let zoom = 13;
    if (maxSpan > 0.3) zoom = 10;
    else if (maxSpan > 0.15) zoom = 11;
    else if (maxSpan > 0.08) zoom = 12;
    else if (maxSpan > 0.035) zoom = 13;
    else if (maxSpan > 0.015) zoom = 14;
    else zoom = 15;

    return { minLat, maxLat, minLng, maxLng, centerLat, centerLng, zoom };
  }, [validPoints]);

  // Состояние интерактивности OSM карты
  const [zoomOffset, setZoomOffset] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const effectiveZoom = Math.min(17, Math.max(10, (bounds?.zoom ?? 13) + zoomOffset));

  // Размеры контейнера
  const mapWidth = 720;
  const mapHeight = isFullscreen ? 550 : isMobile ? 220 : 380;

  // Отрисовка тайлов OpenStreetMap
  const tiles = useMemo(() => {
    if (!bounds || viewMode !== "osm") return [];
    const center = latLngToMercator(bounds.centerLat, bounds.centerLng, effectiveZoom);

    // Смещение центра с учётом панорамирования
    const centerPixelX = center.x * 256 - pan.x;
    const centerPixelY = center.y * 256 - pan.y;

    const minPixelX = centerPixelX - mapWidth / 2;
    const maxPixelX = centerPixelX + mapWidth / 2;
    const minPixelY = centerPixelY - mapHeight / 2;
    const maxPixelY = centerPixelY + mapHeight / 2;

    const minTileX = Math.floor(minPixelX / 256);
    const maxTileX = Math.floor(maxPixelX / 256);
    const minTileY = Math.floor(minPixelY / 256);
    const maxTileY = Math.floor(maxPixelY / 256);

    const tileList: Array<{ key: string; url: string; left: number; top: number }> = [];

    for (let tx = minTileX; tx <= maxTileX; tx++) {
      for (let ty = minTileY; ty <= maxTileY; ty++) {
        const left = tx * 256 - minPixelX;
        const top = ty * 256 - minPixelY;
        // Используем стандартные открытые тайлы OpenStreetMap
        tileList.push({
          key: `${effectiveZoom}-${tx}-${ty}`,
          url: `https://tile.openstreetmap.org/${effectiveZoom}/${tx}/${ty}.png`,
          left,
          top,
        });
      }
    }

    return tileList;
  }, [bounds, effectiveZoom, pan, mapWidth, mapHeight, viewMode]);

  // Перевод координат точек в пиксели экрана OSM
  const projectedPoints = useMemo(() => {
    if (!bounds) return [];
    const center = latLngToMercator(bounds.centerLat, bounds.centerLng, effectiveZoom);
    const centerPixelX = center.x * 256 - pan.x;
    const centerPixelY = center.y * 256 - pan.y;
    const minPixelX = centerPixelX - mapWidth / 2;
    const minPixelY = centerPixelY - mapHeight / 2;

    return validPoints.map((p, idx) => {
      const pt = latLngToMercator(p.lat, p.lng, effectiveZoom);
      const x = pt.x * 256 - minPixelX;
      const y = pt.y * 256 - minPixelY;
      return { ...p, x, y, index: idx + 1 };
    });
  }, [validPoints, bounds, effectiveZoom, pan, mapWidth, mapHeight]);

  // Векторные координаты для схемы (viewMode === 'schema')
  const schemaPoints = useMemo(() => {
    if (!bounds || validPoints.length === 0) return [];
    const pad = 48;
    const w = mapWidth - pad * 2;
    const h = mapHeight - pad * 2;

    const latSpan = Math.max(0.005, bounds.maxLat - bounds.minLat);
    const lngSpan = Math.max(0.005, bounds.maxLng - bounds.minLng);

    return validPoints.map((p, idx) => {
      // Широта растёт на север (вверх), в SVG y растёт вниз -> инвертируем
      const x = pad + ((p.lng - bounds.minLng) / lngSpan) * w;
      const y = pad + (1 - (p.lat - bounds.minLat) / latSpan) * h;
      return { ...p, x, y, index: idx + 1 };
    });
  }, [validPoints, bounds, mapWidth, mapHeight]);

  if (validPoints.length < 2 || !bounds) {
    return (
      <div className="rounded-xl border border-fog p-6 text-center text-sm text-frost-dark bg-snow">
        Недостаточно координат для отображения интерактивной карты
      </div>
    );
  }

  const first = validPoints[0];
  const last = validPoints[validPoints.length - 1];

  // Ссылки на внешние открытые сервисы
  const osmRouteUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_car&route=${first.lat}%2C${first.lng}%3B${last.lat}%2C${last.lng}`;
  const twoGisUrl = `https://2gis.ru/tomsk/routeSearch/rsType/car/from/${first.lng}%2C${first.lat}/to/${last.lng}%2C${last.lat}`;
  const yandexUrl = `https://yandex.ru/maps/?rtext=${first.lat},${first.lng}~${last.lat},${last.lng}&rtt=auto`;

  // Обработчики драга OSM карты
  const onMouseDown = (e: React.MouseEvent) => {
    if (viewMode !== "osm") return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || viewMode !== "osm") return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
  };

  const onMouseUp = () => {
    isDragging.current = false;
  };

  const currentPoints = viewMode === "osm" ? projectedPoints : schemaPoints;
  const polylineStr = currentPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div
      className={`relative rounded-2xl border border-fog overflow-hidden bg-snow transition-all shadow-sm ${
        isFullscreen ? "fixed inset-4 z-50 shadow-2xl bg-white" : ""
      }`}
    >
      {/* Панель управления картой */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-snow/90 backdrop-blur-md border-b border-fog/80 gap-2 flex-wrap z-10 relative">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setViewMode("osm");
              setActiveStop(null);
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              viewMode === "osm"
                ? "bg-river text-white shadow-xs"
                : "bg-snow text-taiga hover:bg-river/10 border border-fog/60"
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Карта (OSM)
          </button>
          <button
            type="button"
            onClick={() => {
              setViewMode("schema");
              setActiveStop(null);
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors ${
              viewMode === "schema"
                ? "bg-river text-white shadow-xs"
                : "bg-snow text-taiga hover:bg-river/10 border border-fog/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Векторная схема
          </button>
        </div>

        <div className="flex items-center gap-1">
          {viewMode === "osm" && (
            <>
              <button
                type="button"
                onClick={() => setZoomOffset((z) => Math.min(3, z + 1))}
                className="p-1.5 rounded-lg bg-snow border border-fog/60 hover:bg-river/10 text-taiga"
                title="Приблизить"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomOffset((z) => Math.max(-3, z - 1))}
                className="p-1.5 rounded-lg bg-snow border border-fog/60 hover:bg-river/10 text-taiga"
                title="Отдалить"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoomOffset(0);
                  setPan({ x: 0, y: 0 });
                }}
                className="p-1.5 rounded-lg bg-snow border border-fog/60 hover:bg-river/10 text-taiga"
                title="Сбросить масштаб"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-snow border border-fog/60 hover:bg-river/10 text-taiga ml-1"
            title={isFullscreen ? "Свернуть" : "На весь экран"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Контейнер интерактивного холста */}
      <div
        className="relative overflow-hidden select-none cursor-grab active:cursor-grabbing bg-slate-50 touch-pan-y"
        style={{ height: mapHeight }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        {/* Слой тайлов OpenStreetMap */}
        {viewMode === "osm" && (
          <div className="absolute inset-0 pointer-events-none">
            {tiles.map((t) => (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={t.key}
                src={t.url}
                alt=""
                className="absolute w-[256px] h-[256px] opacity-90 transition-opacity duration-300"
                style={{ left: t.left, top: t.top }}
                loading="eager"
                onError={(e) => {
                  // При временной недоступности OSM тайлов мягко переключаем на вектор
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ))}
          </div>
        )}

        {/* Слой схемы: река Томь и стилизованный план города (viewMode === 'schema') */}
        {viewMode === "schema" && (
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-blue-50/30 pointer-events-none">
            <svg className="w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5" strokeDasharray="2,2" />
                </pattern>
                <linearGradient id="riverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
              {/* Стилизованная лента реки Томь (проходит с юга на север Томска) */}
              <path
                d="M 60,450 C 70,360 120,280 140,200 C 160,120 130,60 150,0 L 90,0 C 70,60 100,120 80,200 C 60,280 20,360 0,450 Z"
                fill="url(#riverGrad)"
              />
              <text x="85" y="190" fill="#0284c7" fontSize="10" transform="rotate(-65 85 190)" fontWeight="600" opacity="0.6">
                р. Томь
              </text>
            </svg>
          </div>
        )}

        {/* SVG-слой: линия маршрута и точки остановок */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <linearGradient id="routeLineGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Тень/ореол линии */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="#1e3a8a"
            strokeWidth="7"
            strokeOpacity="0.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Основная линия маршрута */}
          <polyline
            points={polylineStr}
            fill="none"
            stroke="url(#routeLineGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={viewMode === "schema" ? "none" : undefined}
          />

          {/* Точки промежуточных остановок */}
          {currentPoints.map((pt, i) => {
            const isFirst = i === 0;
            const isLast = i === currentPoints.length - 1;

            if (isFirst || isLast) return null;

            return (
              <g
                key={`stop-${pt.name}-${i}`}
                className="pointer-events-auto cursor-pointer group"
                onClick={() => setActiveStop({ name: pt.name, index: pt.index, x: pt.x, y: pt.y })}
              >
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="5"
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth="2.5"
                  className="transition-transform group-hover:scale-150"
                />
              </g>
            );
          })}

          {/* Старт (точка А) */}
          {currentPoints.length > 0 && (
            <g className="pointer-events-auto cursor-pointer" onClick={() => setActiveStop({ name: originName, index: 1, x: currentPoints[0].x, y: currentPoints[0].y })}>
              <circle cx={currentPoints[0].x} cy={currentPoints[0].y} r="10" fill="#10b981" stroke="#ffffff" strokeWidth="2.5" />
              <text x={currentPoints[0].x} y={currentPoints[0].y + 3.5} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                A
              </text>
            </g>
          )}

          {/* Финиш (точка Б) */}
          {currentPoints.length > 1 && (
            <g
              className="pointer-events-auto cursor-pointer"
              onClick={() => {
                const lastPt = currentPoints[currentPoints.length - 1];
                setActiveStop({ name: destName, index: currentPoints.length, x: lastPt.x, y: lastPt.y });
              }}
            >
              <circle
                cx={currentPoints[currentPoints.length - 1].x}
                cy={currentPoints[currentPoints.length - 1].y}
                r="10"
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="2.5"
              />
              <text
                x={currentPoints[currentPoints.length - 1].x}
                y={currentPoints[currentPoints.length - 1].y + 3.5}
                textAnchor="middle"
                fill="#ffffff"
                fontSize="9"
                fontWeight="bold"
              >
                B
              </text>
            </g>
          )}
        </svg>

        {/* Тултип выбранной остановки */}
        {activeStop && (
          <div
            className="absolute z-30 bg-white/95 backdrop-blur-md rounded-xl p-2.5 shadow-lg border border-fog text-xs pointer-events-auto transition-transform -translate-x-1/2 -translate-y-full mb-2 max-w-[220px]"
            style={{ left: Math.min(mapWidth - 110, Math.max(110, activeStop.x)), top: activeStop.y - 12 }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="font-semibold text-taiga truncate">{activeStop.name}</span>
              <button
                type="button"
                onClick={() => setActiveStop(null)}
                className="text-frost-dark hover:text-taiga font-bold text-xs"
              >
                ✕
              </button>
            </div>
            <p className="text-[10px] text-frost-dark">
              {activeStop.index === 1
                ? "🟢 Начало поездки (посадка)"
                : activeStop.index === currentPoints.length
                ? "🔴 Конец поездки (высадка)"
                : `Остановка #${activeStop.index} по пути`}
            </p>
          </div>
        )}
      </div>

      {/* Футер карты со ссылками на открытые сервисы */}
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-[11px] text-frost-dark border-t border-fog/80 bg-snow flex-wrap">
        <div className="flex items-center gap-2">
          <span className="font-utility font-medium text-taiga">
            {validPoints.length} остановок на карте
          </span>
          <span>·</span>
          <span>© OpenStreetMap contributors</span>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={twoGisUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-river hover:underline inline-flex items-center gap-1 font-medium"
          >
            2ГИС Томск
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={osmRouteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-river hover:underline inline-flex items-center gap-1 font-medium"
          >
            OSM Навигация
            <ExternalLink className="w-3 h-3" />
          </a>
          <a
            href={yandexUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-frost-dark hover:underline inline-flex items-center gap-1"
          >
            Яндекс
          </a>
        </div>
      </div>
    </div>
  );
}
