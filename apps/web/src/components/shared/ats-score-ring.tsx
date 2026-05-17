"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface ATSScoreRingProps {
  score: number;
  size?: "sm" | "md" | "lg";
  animated?: boolean;
  className?: string;
}

const SIZE_MAP = {
  sm: { diameter: 40, strokeWidth: 4, fontSize: "text-[10px]" },
  md: { diameter: 72, strokeWidth: 6, fontSize: "text-sm" },
  lg: { diameter: 120, strokeWidth: 8, fontSize: "text-2xl" },
};

export function ATSScoreRing({
  score,
  size = "md",
  animated = true,
  className,
}: ATSScoreRingProps) {
  const { diameter, strokeWidth, fontSize } = SIZE_MAP[size];
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      style={{ width: diameter, height: diameter }}
    >
      <svg
        width={diameter}
        height={diameter}
        className="score-ring"
        aria-label={`ATS Score: ${score} out of 100`}
      >
        {/* Background circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border"
        />
        {/* Score circle */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animated ? circumference : offset}
          style={
            animated
              ? {
                  strokeDashoffset: offset,
                  transition: "stroke-dashoffset 1.5s ease-out",
                }
              : undefined
          }
        />
      </svg>
      {size !== "sm" && (
        <span
          className={cn(
            "absolute font-bold tabular-nums",
            fontSize,
            score >= 80
              ? "text-green-400"
              : score >= 60
              ? "text-yellow-400"
              : "text-red-400"
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
