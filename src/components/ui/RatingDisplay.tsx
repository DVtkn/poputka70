import { Star, Car } from "lucide-react";

export default function RatingDisplay({
  ratingAsDriver,
  ratingAsPassenger,
  compact = false,
}: {
  ratingAsDriver?: number;
  ratingAsPassenger?: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-sm tabular-nums">
        {ratingAsDriver !== undefined && (
          <span className="inline-flex items-center gap-1 text-frost-dark">
            <Car className="w-4 h-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="font-utility font-semibold text-taiga">{ratingAsDriver.toFixed(1)}</span>
          </span>
        )}
        {ratingAsPassenger !== undefined && (
          <span className="inline-flex items-center gap-1 text-frost-dark">
            <Star className="w-4 h-4 text-birch fill-birch shrink-0" strokeWidth={1.75} aria-hidden="true" />
            <span className="font-utility font-semibold text-taiga">{ratingAsPassenger.toFixed(1)}</span>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-fog text-sm">
      {ratingAsDriver !== undefined && (
        <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <span className="text-frost-dark">Рейтинг как водитель</span>
          <span className="font-utility font-semibold tabular-nums text-taiga inline-flex items-center gap-1">
            {ratingAsDriver.toFixed(1)}
            <Star className="w-3.5 h-3.5 text-birch fill-birch shrink-0" aria-hidden="true" />
          </span>
        </div>
      )}
      {ratingAsPassenger !== undefined && (
        <div className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <span className="text-frost-dark">Рейтинг как пассажир</span>
          <span className="font-utility font-semibold tabular-nums text-taiga inline-flex items-center gap-1">
            {ratingAsPassenger.toFixed(1)}
            <Star className="w-3.5 h-3.5 text-birch fill-birch shrink-0" aria-hidden="true" />
          </span>
        </div>
      )}
    </div>
  );
}
