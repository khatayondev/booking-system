import * as React from "react";
import { BookingStatusType } from "@/lib/payments/types";
import { Check, Clock, AlertCircle, Ban, UserCheck, ShieldCheck } from "lucide-react";

export function BookingStatusBadge({
  status,
  size = "md",
  className = "",
}: {
  status: BookingStatusType;
  size?: "sm" | "md";
  className?: string;
}) {
  const isSm = size === "sm";
  const baseClasses = isSm
    ? "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all"
    : "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all";

  switch (status) {
    case "CONFIRMED":
      return (
        <span
          className={`${baseClasses} bg-[#1E1E1E] text-white border border-black/20 shadow-xs ${className}`}
        >
          <ShieldCheck className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>Confirmed</span>
        </span>
      );

    case "CHECKED_IN":
      return (
        <span
          className={`${baseClasses} bg-zinc-200 text-zinc-900 border border-zinc-400 shadow-xs ${className}`}
          style={{
            backgroundImage: "radial-gradient(#a1a1aa 0.75px, transparent 0.75px)",
            backgroundSize: "6px 6px",
          }}
        >
          <UserCheck className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>Checked In</span>
        </span>
      );

    case "COMPLETED":
      return (
        <span
          className={`${baseClasses} bg-white text-zinc-900 border-2 border-zinc-900 shadow-xs ${className}`}
        >
          <Check className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>Completed</span>
        </span>
      );

    case "PENDING_PAYMENT":
      return (
        <span
          className={`${baseClasses} bg-zinc-100 text-zinc-700 border-2 border-dashed border-zinc-400 ${className}`}
        >
          <Clock className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>Pending Pay</span>
        </span>
      );

    case "HELD":
      return (
        <span
          className={`${baseClasses} bg-zinc-50 text-zinc-600 border-2 border-dotted border-zinc-300 ${className}`}
        >
          <Clock className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>Held</span>
        </span>
      );

    case "CANCELLED":
      return (
        <span
          className={`${baseClasses} bg-zinc-100 text-zinc-500 border border-zinc-300 line-through ${className}`}
        >
          <Ban className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>Cancelled</span>
        </span>
      );

    case "NO_SHOW":
      return (
        <span
          className={`${baseClasses} bg-zinc-200 text-zinc-700 border border-zinc-400 ${className}`}
        >
          <AlertCircle className={isSm ? "w-2.5 h-2.5" : "w-3 h-3"} />
          <span>No Show</span>
        </span>
      );

    default:
      return (
        <span className={`${baseClasses} bg-zinc-100 text-zinc-800 ${className}`}>
          {status}
        </span>
      );
  }
}
