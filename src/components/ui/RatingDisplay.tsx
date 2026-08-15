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
      <div className="flex items-center gap-3 text-sm">
        {ratingAsDriver !== undefined && (
          <span className="inline-flex items-center gap-1.5 text-frost">
            <Car className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-utility font-semibold text-taiga">{ratingAsDriver.toFixed(1)}</span>
          </span>
        )}
        {ratingAsPassenger !== undefined && (
          <span className="inline-flex items-center gap-1.5 text-frost">
            <Star className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
            <span className="font-utility font-semibold text-taiga">{ratingAsPassenger.toFixed(1)}</span>
          </span>
        )}
      </div>
    );
  }
  
  return (
    <div className="space-y-2">
      {ratingAsDriver !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-frost">Рейтинг как водитель</span>
          <span className="font-utility font-bold text-taiga inline-flex items-center gap-1">
            {ratingAsDriver.toFixed(1)} <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
          </span>
        </div>
      )}
      {ratingAsPassenger !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-frost">Рейтинг как пассажир</span>
          <span className="font-utility font-bold text-taiga inline-flex items-center gap-1">
            {ratingAsPassenger.toFixed(1)} <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
          </span>
        </div>
      )}
    </div>
  );
}
