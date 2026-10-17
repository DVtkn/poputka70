"use client";

import { useEffect, useRef } from "react";

interface RoutePoint {
  name: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Интерактивная карта маршрута: OpenStreetMap + полилиния по остановкам.
 * Без API-ключей; тайлы грузятся только в браузере.
 */
export default function RouteMap({
  points,
  originName,
  destName,
}: {
  points: RoutePoint[];
  originName: string;
  destName: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const withCoords = points.filter(
      (point): point is { name: string; lat: number; lng: number } =>
        typeof point.lat === "number" && typeof point.lng === "number"
    );
    if (withCoords.length < 2) return;

    let map: import("leaflet").Map | null = null;
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current) return;

      const leafletMap = L.map(containerRef.current, {
        scrollWheelZoom: false,
        zoomControl: true,
      });
      map = leafletMap;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>',
      }).addTo(leafletMap);

      const latlngs = withCoords.map((point) => [point.lat, point.lng] as [number, number]);
      L.polyline(latlngs, { color: "#1E5B43", weight: 4, opacity: 0.9 }).addTo(leafletMap);

      withCoords.forEach((point, index) => {
        const first = index === 0;
        const last = index === withCoords.length - 1;
        const marker = L.circleMarker([point.lat, point.lng], {
          radius: first || last ? 8 : 5,
          color: first ? "#1E5B43" : last ? "#B26A1F" : "#1E5B43",
          fillColor: first ? "#1E5B43" : last ? "#B26A1F" : "#FFFFFF",
          fillOpacity: 1,
          weight: 2,
        }).addTo(leafletMap);
        marker.bindTooltip(point.name, { direction: "top" });
      });

      leafletMap.fitBounds(L.latLngBounds(latlngs).pad(0.15));
    })();

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [points, originName, destName]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-56 md:h-64 w-full rounded-xl overflow-hidden border border-fog z-0"
        role="img"
        aria-label={`Карта маршрута ${originName} — ${destName}, ${points.length} остановок`}
      />
      <div className="text-[10px] text-frost-dark mt-1.5 px-1">
        Карта: остановки и линия маршрута · OpenStreetMap
      </div>
    </div>
  );
}
