import * as React from "react";
import { cn } from "@/lib/utils";
import { Card } from "./card";

export interface MiniStatTile {
  label: string;
  value: string | number;
  change?: string;
}

interface KpiCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    direction: "up" | "down" | "neutral";
    value: string;
  };
  miniStats?: MiniStatTile[];
  variant?: "glass" | "dark" | "white";
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  miniStats,
  variant = "white",
  className,
}: KpiCardProps) {
  const isDark = variant === "dark";

  return (
    <Card variant={variant} className={cn("flex flex-col justify-between", className)}>
      <div>
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider mb-2">
          <span className={isDark ? "text-white/70" : "text-[#71717A]"}>{title}</span>
          {trend && (
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                trend.direction === "up"
                  ? isDark
                    ? "bg-white/10 text-emerald-400"
                    : "bg-[#F0FDF4] text-[#166534]"
                  : isDark
                  ? "bg-white/10 text-rose-400"
                  : "bg-[#FEF2F2] text-[#991B1B]"
              )}
            >
              {trend.direction === "up" ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>

        {/* Big bold numeral */}
        <div className="text-3xl lg:text-4xl font-extrabold tracking-tight mt-1">
          {value}
        </div>
        {subtitle && (
          <p className={cn("text-xs mt-1", isDark ? "text-white/60" : "text-[#71717A]")}>
            {subtitle}
          </p>
        )}
      </div>

      {miniStats && miniStats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-6 mt-4 border-t border-current/10">
          {miniStats.map((stat, idx) => (
            <div
              key={idx}
              className={cn(
                "p-2.5 rounded-2xl flex flex-col justify-center",
                isDark ? "bg-white/5 border border-white/10" : "bg-[#F4F4F6] border border-[#E4E4E7]"
              )}
            >
              <span className={cn("text-[11px]", isDark ? "text-white/60" : "text-[#71717A]")}>
                {stat.label}
              </span>
              <span className="text-sm font-bold tracking-tight mt-0.5">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
