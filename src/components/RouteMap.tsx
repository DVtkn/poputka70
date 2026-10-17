interface RoutePoint {
  name: string;
  lat: number | null;
  lng: number | null;
}

/** Статическая карта маршрута на Яндекс.Картах: линия по остановкам и точки начала/конца. */
export default function RouteMap({
  points,
  originName,
  destName,
}: {
  points: RoutePoint[];
  originName: string;
  destName: string;
}) {
  const withCoords = points
    .filter(
      (point): point is { name: string; lat: number; lng: number } =>
        typeof point.lat === "number" && typeof point.lng === "number"
    )
    .slice(0, 40);

  if (withCoords.length < 2) return null;

  const first = withCoords[0];
  const last = withCoords[withCoords.length - 1];
  const polyline = withCoords.map((point) => `${point.lng.toFixed(5)},${point.lat.toFixed(5)}`).join(",");
  const markers = `${first.lng.toFixed(5)},${first.lat.toFixed(5)},pm2gnl~${last.lng.toFixed(5)},${last.lat.toFixed(5)},pm2rdl`;

  const staticMap = `https://static-maps.yandex.ru/1.x/?l=map&size=650,400&lang=ru_RU&pl=${polyline},blue,4&pt=${markers}`;
  const routeLink = `https://yandex.ru/maps/?rtext=${first.lat},${first.lng}~${last.lat},${last.lng}&rtt=auto`;

  return (
    <div className="rounded-xl border border-fog overflow-hidden bg-snow">
      {/* eslint-disable-next-line @next/next/no-img-element -- статическая карта Яндекс.Карт, next/image не нужен */}
      <img
        src={staticMap}
        alt={`Карта маршрута ${originName} — ${destName}: ${withCoords.length} остановок`}
        width={650}
        height={400}
        className="w-full h-auto"
        loading="lazy"
      />
      <div className="flex items-center justify-between gap-3 px-3 py-2 text-[10px] text-frost-dark border-t border-fog">
        <span>Остановки и линия маршрута · © Яндекс Карты</span>
        <a
          href={routeLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-river hover:underline whitespace-nowrap"
        >
          Открыть в Яндекс.Картах
        </a>
      </div>
    </div>
  );
}
