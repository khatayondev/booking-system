import * as React from "react";
import { cn } from "@/lib/utils";

export type StatusType = "green" | "amber" | "red" | "grey";

interface StatusChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: StatusType;
  label: string;
  dot?: boolean;
}

const statusStyles: Record<StatusType, { bg: string; text: string; dotColor: string }> = {
  green: {
    bg: "bg-[#F0FDF4] border-[#DCFCE7]",
    text: "text-[#166534]",
    dotColor: "bg-[#22C55E]",
  },
  amber: {
    bg: "bg-[#FFFBEB] border-[#FEF3C7]",
    text: "text-[#92400E]",
    dotColor: "bg-[#F59E0B]",
  },
  red: {
    bg: "bg-[#FEF2F2] border-[#FEE2E2]",
    text: "text-[#991B1B]",
    dotColor: "bg-[#EF4444]",
  },
  grey: {
    bg: "bg-[#F4F4F5] border-[#E4E4E7]",
    text: "text-[#3F3F46]",
    dotColor: "bg-[#71717A]",
  },
};

export function StatusChip({
  status = "grey",
  label,
  dot = true,
  className,
  ...props
}: StatusChipProps) {
  const config = statusStyles[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border select-none transition-colors",
        config.bg,
        config.text,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", config.dotColor)}
          aria-hidden="true"
        />
      )}
      {label}
    </span>
  );
}
