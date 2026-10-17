interface RoutePoint {
  name: string;
  lat: number | null;
  lng: number | null;
}

/** Схематичная карта маршрута: проекция координат остановок, без внешних тайлов. */
export default function RouteMap({
  points,
  originName,
  destName,
}: {
  points: RoutePoint[];
  originName: string;
  destName: string;
}) {
  const withCoords = points.filter((point): point is { name: string; lat: number; lng: number } =>
    point.lat !== null && point.lng !== null
  );
  if (withCoords.length < 2) return null;

  const lats = withCoords.map((point) => point.lat);
  const lngs = withCoords.map((point) => point.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const pad = 18;
  const width = 320;
  const height = 200;
  const latSpan = Math.max(maxLat - minLat, 0.0001);
  const lngSpan = Math.max(maxLng - minLng, 0.0001);

  const project = (lat: number, lng: number) => {
    const x = pad + ((lng - minLng) / lngSpan) * (width - pad * 2);
    const y = height - pad - ((lat - minLat) / latSpan) * (height - pad * 2);
    return { x, y };
  };

  const path = withCoords
    .map((point, index) => {
      const { x, y } = project(point.lat, point.lng);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const start = project(withCoords[0].lat, withCoords[0].lng);
  const end = project(withCoords[withCoords.length - 1].lat, withCoords[withCoords.length - 1].lng);

  return (
    <div className="rounded-xl border border-fog bg-snow p-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Схема маршрута ${originName} — ${destName}`}
        className="w-full h-44"
      >
        <path d={path} fill="none" stroke="var(--river)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" />
        {withCoords.slice(1, -1).map((point) => {
          const { x, y } = project(point.lat, point.lng);
          return <circle key={point.name} cx={x} cy={y} r="2.2" fill="#ffffff" stroke="var(--river)" strokeWidth="1.4" />;
        })}
        <circle cx={start.x} cy={start.y} r="5" fill="var(--river)" />
        <circle cx={end.x} cy={end.y} r="5" fill="var(--birch)" />
      </svg>
      <div className="flex items-center justify-between text-[11px] text-frost-dark px-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-river" aria-hidden="true" />
          {originName}
        </span>
        <span className="inline-flex items-center gap-1.5">
          {destName}
          <span className="w-2 h-2 rounded-full bg-birch" aria-hidden="true" />
        </span>
      </div>
    </div>
  );
}
