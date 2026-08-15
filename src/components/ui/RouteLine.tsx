"use client";

import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface RouteLineProps {
  from: string;
  to: string;
  compact?: boolean;
  animated?: boolean;
  className?: string;
}

const RouteLineSkeleton = ({ width = 280 }: { width?: number }) => (
  <motion.svg
    viewBox={`0 0 ${width} 40`}
    className="w-full block route-line-svg"
    style={{ height: "40px", maxWidth: width }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3 }}
  >
    <motion.path
      d={`M 20 20 C 80 10, ${width - 60} 30, ${width - 20} 20`}
      stroke="var(--river)"
      strokeWidth={2}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1000"
      strokeDashoffset="1000"
      initial={{ pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    />
    <circle cx="20" cy="20" r="4" fill="var(--river)" />
    <circle cx={width - 20} cy="20" r="4" fill="var(--birch)" />
  </motion.svg>
);

export function RouteLine({ from, to, compact = false, animated = false, className }: RouteLineProps) {
  const fromShort = compact && from.length > 12 ? from.slice(0, 11) + "…" : from;
  const toShort = compact && to.length > 12 ? to.slice(0, 11) + "…" : to;
  const width = compact ? 280 : 340;

  const path = `M 20 20 C 80 10, ${width - 60} 30, ${width - 20} 20`;

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <motion.svg
        viewBox={`0 0 ${width} 40`}
        className={cn("w-full block route-line-svg", className)}
        style={{ height: "40px", maxWidth: width }}
        role="img"
        aria-label={`Маршрут: ${from} — ${to}`}
      >
        <defs>
          <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--river)" stopOpacity="0.8" />
            <stop offset="50%" stopColor="var(--birch)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--river)" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        
        <motion.path
          d={path}
          stroke="url(#route-gradient)"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={animated ? "1000" : "none"}
          strokeDashoffset={animated ? "1000" : "0"}
          initial={animated ? { pathLength: 0 } : { pathLength: 1 }}
          animate={animated ? { pathLength: 1 } : { pathLength: 1 }}
          transition={animated ? { duration: 0.8, ease: "easeOut" } : undefined}
        />
        
        <circle cx="20" cy="20" r="4" fill="var(--river)" />
        <circle cx={width - 20} cy="20" r="4" fill="var(--birch)" />
        
        {!compact && (
          <>
            <text x="20" y="8" fill="var(--taiga)" fontSize="9" fontFamily="var(--font-golos)" fontWeight="600" textAnchor="start">{fromShort}</text>
            <text x={width - 20} y="8" fill="var(--taiga)" fontSize="9" fontFamily="var(--font-golos)" fontWeight="600" textAnchor="end">{toShort}</text>
          </>
        )}
      </motion.svg>

      {compact && (
        <div className="flex items-center gap-2 text-xs text-frost">
          <span className="text-birch">●</span>
          <span className="truncate max-w-[120px] font-medium text-taiga">{fromShort}</span>
          <MapPin className="w-3 h-3 text-river" strokeWidth={2} />
          <span className="truncate max-w-[120px] font-medium text-taiga">{toShort}</span>
        </div>
      )}
    </div>
  );
}

export { RouteLineSkeleton };