"use client";

import { useId } from "react";

export default function RouteLine({ from, to, compact = false }: { from: string; to: string; compact?: boolean }) {
  const uniqueId = useId();
  const gradientId = "route-line-" + uniqueId.replace(/:/g, "");
  const height = compact ? 40 : 80;
  const fontSize = compact ? 12 : 16;
  
  return (
    <div className="w-full">
      <svg
        viewBox={"0 0 400 " + height}
        className="w-full"
        style={{ height: height + "px" }}
        role="img"
        aria-label={"Маршрут: " + from + " — " + to}
      >
        <defs>
          <linearGradient id={gradientId + "-grad"} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1C4E66" stopOpacity="0.3" />
            <stop offset="50%" stopColor="#1C4E66" stopOpacity="1" />
            <stop offset="100%" stopColor="#1C4E66" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        <path
          d={"M 20 " + (height / 2) + " C 100 " + (height / 4) + ", 300 " + (height * 3 / 4) + ", 380 " + (height / 2)}
          stroke={"url(#" + gradientId + "-grad)"}
          strokeWidth={compact ? "1" : "2"}
          fill="none"
          strokeDasharray="400"
          strokeDashoffset="400"
          className="route-line-draw"
        />
        
        <circle cx="20" cy={height / 2} r={compact ? "3" : "5"} fill="#1C4E66" />
        <circle cx="380" cy={height / 2} r={compact ? "3" : "5"} fill="#C98A3E" />
        
        <text x="20" y={height / 2 - (compact ? 12 : 18)} fill="#14171A" fontSize={fontSize} fontFamily="var(--font-golos)">
          {from}
        </text>
        <text x="380" y={height / 2 - (compact ? 12 : 18)} fill="#14171A" fontSize={fontSize} fontFamily="var(--font-golos)" textAnchor="end">
          {to}
        </text>
      </svg>
      
      <style>{`
        .route-line-draw {
          animation: drawLine 2s ease-out forwards;
        }
        @keyframes drawLine {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
