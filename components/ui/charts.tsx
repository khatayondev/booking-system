"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { cn } from "@/lib/utils";

// Circular Progress Ring
interface CircularProgressRingProps {
  progress: number; // 0 to 100
  size?: number;
  strokeWidth?: number;
  label?: string;
  sublabel?: string;
  className?: string;
}

export function CircularProgressRing({
  progress,
  size = 120,
  strokeWidth = 10,
  label,
  sublabel,
  className,
}: CircularProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, Math.max(0, progress)) / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E4E4E7"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#1E1E1E"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="transition-all duration-500 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xl font-extrabold text-[#1E1E1E]">
          {label ?? `${Math.round(progress)}%`}
        </span>
        {sublabel && <span className="text-[10px] text-[#71717A] uppercase">{sublabel}</span>}
      </div>
    </div>
  );
}

// Donut Ring (Category breakdown)
export interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

interface DonutRingProps {
  data: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const MONOCHROME_SHADES = ["#1E1E1E", "#52525B", "#A1A1AA", "#D4D4D8", "#E4E4E7"];

export function DonutRing({
  data,
  size = 140,
  strokeWidth = 18,
  className,
}: DonutRingProps) {
  const total = data.reduce((acc, curr) => acc + curr.value, 0) || 1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Pure functional calculation of segments with zero mutations
  const segments = React.useMemo(() => {
    return data.map((item, idx) => {
      const percent = item.value / total;
      const prevTotal = data.slice(0, idx).reduce((sum, d) => sum + d.value, 0);
      const prevPercent = prevTotal / total;
      const offset = -(prevPercent * circumference);
      const color = item.color || MONOCHROME_SHADES[idx % MONOCHROME_SHADES.length];
      return {
        ...item,
        percent,
        strokeDasharray: `${percent * circumference} ${circumference}`,
        strokeDashoffset: offset,
        color,
      };
    });
  }, [data, total, circumference]);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center gap-6", className)}>
      <div className="relative shrink-0">
        <svg width={size} height={size} className="rotate-[-90deg]">
          {segments.map((item, idx) => (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={item.strokeDasharray}
              strokeDashoffset={item.strokeDashoffset}
              fill="none"
              className="transition-all duration-300"
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-[#1E1E1E]">{total}</span>
          <span className="text-[10px] text-[#71717A] uppercase">Total</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        {data.map((item, idx) => {
          const color = item.color || MONOCHROME_SHADES[idx % MONOCHROME_SHADES.length];
          const pct = Math.round((item.value / total) * 100);
          return (
            <div key={idx} className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-[#71717A] truncate">{item.label}</span>
              <span className="font-semibold text-[#1E1E1E]">{pct}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Line Chart matching reference UI: thin black line with a grey comparison line, highlighted active-day dot with small tooltip badge
export interface ChartDataPoint {
  day: string;
  current: number;
  previous: number;
  isActive?: boolean;
}

interface LineChartProps {
  data: ChartDataPoint[];
  height?: number;
  className?: string;
}

export function LineChart({ data, height = 220, className }: LineChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717A", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A1A1AA", fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const currentVal = payload.find((p) => p.dataKey === "current")?.value;
                const prevVal = payload.find((p) => p.dataKey === "previous")?.value;
                return (
                  <div className="bg-[#1E1E1E] text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/10 text-xs">
                    <p className="font-semibold">GH₵ {currentVal}</p>
                    <p className="text-[10px] text-white/60">Prev: GH₵ {prevVal}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          {/* Previous period: subtle grey comparison line */}
          <Line
            type="monotone"
            dataKey="previous"
            stroke="#D4D4D8"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
          />
          {/* Current period: thin black line */}
          <Line
            type="monotone"
            dataKey="current"
            stroke="#1E1E1E"
            strokeWidth={2}
            dot={(props) => {
              const { cx, cy, payload } = props;
              if (payload.isActive) {
                return (
                  <g key={`dot-${payload.day}`}>
                    <circle cx={cx} cy={cy} r={6} fill="#1E1E1E" stroke="#FFFFFF" strokeWidth={2} />
                  </g>
                );
              }
              return <circle key={`dot-${payload.day}`} cx={cx} cy={cy} r={2.5} fill="#1E1E1E" />;
            }}
            activeDot={{ r: 6, fill: "#1E1E1E", stroke: "#FFFFFF", strokeWidth: 2 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

// Monochrome Bar Chart for revenue and breakdowns
export interface BarChartItem {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface BarChartProps {
  data: BarChartItem[];
  height?: number;
  className?: string;
  valuePrefix?: string;
  barColor?: string;
}

export function BarChart({
  data,
  height = 220,
  className,
  valuePrefix = "GH₵ ",
  barColor = "#1E1E1E",
}: BarChartProps) {
  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#71717A", fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#A1A1AA", fontSize: 11 }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const val = payload[0].value;
                const item = payload[0].payload as BarChartItem;
                return (
                  <div className="bg-[#1E1E1E] text-white px-3 py-1.5 rounded-xl shadow-lg border border-white/10 text-xs">
                    <p className="font-semibold">
                      {item.label}: {valuePrefix}{val}
                    </p>
                    {item.secondaryValue !== undefined && (
                      <p className="text-[10px] text-white/60">
                        Refunds: {valuePrefix}{item.secondaryValue}
                      </p>
                    )}
                  </div>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="value" fill={barColor} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

