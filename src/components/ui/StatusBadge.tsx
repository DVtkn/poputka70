import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Navigation,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react";

type StatusConfig = {
  label: string;
  className: string;
  Icon: LucideIcon;
};

const TRIP_STATUS: Record<string, StatusConfig> = {
  SCHEDULED: { label: "Запланирована", className: "text-frost-dark", Icon: Clock },
  PENDING_CONFIRMATION: { label: "Ждёт подтверждения", className: "text-birch-dark", Icon: Clock },
  CONFIRMED: { label: "Опубликована", className: "text-river", Icon: CheckCircle2 },
  IN_PROGRESS: { label: "В пути", className: "text-river", Icon: Navigation },
  COMPLETED: { label: "Завершена", className: "text-frost-dark", Icon: CheckCircle2 },
  CANCELLED_BY_DRIVER: { label: "Отменена водителем", className: "text-ember", Icon: XCircle },
  CANCELLED_BY_PASSENGER: { label: "Отменена пассажиром", className: "text-ember", Icon: XCircle },
  UNCONFIRMED: { label: "Не подтверждена вовремя", className: "text-ember", Icon: AlertCircle },
  NO_SHOW: { label: "Неявка", className: "text-ember", Icon: AlertCircle },
};

const BOOKING_STATUS: Record<string, StatusConfig> = {
  PENDING: { label: "Заявка у водителя", className: "text-birch-dark", Icon: Clock },
  CONFIRMED: { label: "Место подтверждено", className: "text-river", Icon: CheckCircle2 },
  CANCELLED: { label: "Снята", className: "text-ember", Icon: XCircle },
  COMPLETED: { label: "Завершена", className: "text-frost-dark", Icon: CheckCircle2 },
  NO_SHOW: { label: "Неявка", className: "text-ember", Icon: AlertCircle },
};

const VERIFICATION_STATUS: Record<string, StatusConfig> = {
  NOT_SUBMITTED: { label: "Не подана", className: "text-frost-dark", Icon: Clock },
  PENDING: { label: "На проверке", className: "text-birch-dark", Icon: Clock },
  APPROVED: { label: "Проверен", className: "text-birch-dark", Icon: ShieldCheck },
  REJECTED: { label: "Отклонена", className: "text-ember", Icon: XCircle },
};

export default function StatusBadge({
  status,
  type = "trip",
}: {
  status: string;
  type?: "trip" | "booking" | "verification";
}) {
  const map = type === "trip" ? TRIP_STATUS : type === "booking" ? BOOKING_STATUS : VERIFICATION_STATUS;
  const config = map[status] || { label: status, className: "text-frost-dark", Icon: Clock };
  const Icon = config.Icon;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${config.className}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
      {config.label}
    </span>
  );
}