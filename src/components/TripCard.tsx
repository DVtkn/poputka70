"use client";

import { Badge } from "@/components/ui/Badge";
import { Avatar, AvatarFallback } from "@/components/ui/Avatar";
import { Star, ShieldCheck } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import PriceBreakdown from "@/components/ui/PriceBreakdown";
import Link from "next/link";
import TripBooking from "@/components/TripBooking";

type TripCardProps = {
  id: string;
  origin: string;
  destination: string;
  departureTime: string;
  date: string;
  driver: {
    id: string;
    firstName: string;
    lastName: string | null;
    carModel: string;
    carNumber: string;
    carColor: string | null;
    verified: boolean;
    ratingAsDriver: number;
  };
  compensation: number;
  serviceFee: number;
  availableSeats: number;
  totalSeats: number;
  status: string;
  isDriver: boolean;
};

export function TripCard({
  id,
  origin,
  destination,
  departureTime,
  date,
  driver,
  compensation,
  serviceFee,
  availableSeats,
  totalSeats,
  status,
  isDriver,
}: TripCardProps) {
  const formatDate = (dateStr: string) => {
    const months = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
    const d = new Date(dateStr);
    return d.getDate() + " " + months[d.getMonth()];
  };

  const driverName = `${driver.firstName} ${driver.lastName || ""}`.trim();
  const initials = driverName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (isDriver) {
    return (
      <article className="card p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="font-semibold">{origin} → {destination}</h3>
            <p className="text-sm text-frost">{formatDate(date)} • {departureTime}</p>
          </div>
          <StatusBadge status={status} type="trip" />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-frost">
            <span>{availableSeats}/{totalSeats} мест</span>
            <span>•</span>
            <span className="font-utility">{compensation + serviceFee} ₽</span>
          </div>
          <Link href={`/trips/${id}`} className="btn-secondary px-4 py-2 text-sm">Управлять</Link>
        </div>
      </article>
    );
  }

  return (
    <article className="card p-5">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold">{origin} → {destination}</h3>
          <p className="text-sm text-frost">{formatDate(date)} • {departureTime}</p>
        </div>
        <StatusBadge status={status} type="trip" />
      </div>

      <div className="flex items-center gap-3 mb-3">
        <Avatar>
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{driverName}</p>
          <p className="text-xs text-frost font-utility">{driver.carModel} • {driver.carNumber}</p>
        </div>
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-birch fill-birch" aria-hidden="true" />
          <span className="text-sm font-semibold">{driver.ratingAsDriver.toFixed(1)}</span>
          {driver.verified && (
            <Badge variant="birch">
              <ShieldCheck className="w-3.5 h-3.5 mr-1" strokeWidth={2} aria-hidden="true" />
              Проверен
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between mb-3 p-3 rounded-xl bg-snow">
        <span className="text-sm text-frost">Доступно мест</span>
        <span className="font-utility font-bold text-lg">{availableSeats}/{totalSeats}</span>
      </div>

      <PriceBreakdown compensation={compensation} serviceFee={serviceFee} />

      {status === "CONFIRMED" && availableSeats > 0 && (
        <TripBooking
          tripId={id}
          compensation={compensation}
          serviceFee={serviceFee}
          availableSeats={availableSeats}
        />
      )}

      {status !== "CONFIRMED" && (
        <p className="text-center text-sm text-frost mt-3">
          {status === "PENDING_CONFIRMATION" ? "Ожидаем подтверждения водителя" : "Бронирование недоступно"}
        </p>
      )}
    </article>
  );
}