"use client";

import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteLineProps {
  from: string;
  to: string;
  compact?: boolean;
  animated?: boolean;
  className?: string;
}

const RouteLineSkeleton = ({ width }: { width?: number }) => (
  <div
    className="flex items-center gap-2 w-full"
    style={width ? { maxWidth: width } : undefined}
    aria-hidden="true"
  >
    <div className="skeleton h-4 w-24" />
    <div className="h-px flex-1 bg-fog" />
    <div className="skeleton h-4 w-24" />
  </div>
);

export function RouteLine({ from, to, compact = false, animated = false, className }: RouteLineProps) {
  if (compact) {
    return (
      <div
        className={cn("flex items-center gap-1.5 text-xs font-medium text-taiga min-w-0", className)}
        aria-label={`Маршрут: ${from} — ${to}`}
      >
        <span className="truncate">{from}</span>
        <ArrowRight className="w-3.5 h-3.5 text-frost-dark shrink-0" strokeWidth={2} aria-hidden="true" />
        <span className="truncate">{to}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 w-full text-sm md:text-base font-medium text-taiga",
        animated && "transition-opacity duration-150",
        className
      )}
      role="group"
      aria-label={`Маршрут: ${from} — ${to}`}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-2 h-2 rounded-sm bg-river shrink-0" aria-hidden="true" />
        <span className="font-semibold truncate">{from}</span>
      </div>

      <div className="flex items-center gap-1.5 flex-1 min-w-[28px]" aria-hidden="true">
        <div className="h-px flex-1 bg-fog-dark" />
        <ArrowRight className="w-4 h-4 text-river shrink-0" strokeWidth={2} />
      </div>

      <div className="flex items-center gap-2 min-w-0 justify-end">
        <span className="font-semibold truncate text-right">{to}</span>
        <span className="w-2 h-2 rounded-sm bg-birch shrink-0" aria-hidden="true" />
      </div>
    </div>
  );
}

export { RouteLineSkeleton };