type StatusConfig = {
  label: string;
  className: string;
  dot?: boolean;
};

const TRIP_STATUS: Record<string, StatusConfig> = {
  SCHEDULED: { label: "Запланирована", className: "badge-frost", dot: true },
  PENDING_CONFIRMATION: { label: "Ожидает подтверждения", className: "badge-frost", dot: true },
  CONFIRMED: { label: "Подтверждена", className: "badge-river", dot: true },
  IN_PROGRESS: { label: "В пути", className: "badge-river", dot: true },
  COMPLETED: { label: "Завершена", className: "badge-frost", dot: true },
  CANCELLED_BY_DRIVER: { label: "Отменена водителем", className: "badge-ember", dot: true },
  CANCELLED_BY_PASSENGER: { label: "Отменена пассажиром", className: "badge-ember", dot: true },
  UNCONFIRMED: { label: "Не подтверждена вовремя", className: "badge-ember", dot: true },
  NO_SHOW: { label: "Неявка", className: "badge-ember", dot: true },
};

const BOOKING_STATUS: Record<string, StatusConfig> = {
  PENDING: { label: "Ожидает подтверждения", className: "badge-frost", dot: true },
  CONFIRMED: { label: "Подтверждена", className: "badge-river", dot: true },
  CANCELLED: { label: "Отменена", className: "badge-ember", dot: true },
  COMPLETED: { label: "Завершена", className: "badge-frost", dot: true },
  NO_SHOW: { label: "Неявка", className: "badge-ember", dot: true },
};

const VERIFICATION_STATUS: Record<string, StatusConfig> = {
  NOT_SUBMITTED: { label: "Не подана", className: "badge-frost", dot: true },
  PENDING: { label: "На проверке", className: "badge-frost", dot: true },
  APPROVED: { label: "Проверен", className: "badge-birch", dot: true },
  REJECTED: { label: "Отклонена", className: "badge-ember", dot: true },
};

const DOT_CLASSES: Record<string, string> = {
  "badge-frost": "bg-frost",
  "badge-river": "bg-river",
  "badge-ember": "bg-ember",
  "badge-birch": "bg-birch",
};

export default function StatusBadge({
  status,
  type = "trip",
}: {
  status: string;
  type?: "trip" | "booking" | "verification";
}) {
  const map = type === "trip" ? TRIP_STATUS : type === "booking" ? BOOKING_STATUS : VERIFICATION_STATUS;
  const config = map[status] || { label: status, className: "badge-frost", dot: true };

  return (
    <span className={config.className}>
      {config.dot && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${DOT_CLASSES[config.className] || "bg-current"}`}
          aria-hidden="true"
        />
      )}
      {config.label}
    </span>
  );
}