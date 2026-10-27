"use client";

import * as React from "react";
import { LayoutGrid, List, ChevronDown, Check, Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

// Skeleton component
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-[#E4E4E7]/60", className)}
      {...props}
    />
  );
}

// Empty State component
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-12 text-center rounded-[28px] border border-dashed border-[#E4E4E7] bg-white/50",
        className
      )}
    >
      {icon && (
        <div className="w-14 h-14 rounded-full bg-[#F4F4F6] text-[#71717A] flex items-center justify-center mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-base font-bold text-[#1E1E1E]">{title}</h3>
      <p className="text-xs text-[#71717A] mt-1.5 max-w-sm">{description}</p>
      {actionLabel && onAction && (
        <Button variant="blackPill" size="sm" onClick={onAction} className="mt-5">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// Form Inputs: Input, Select, Textarea, Label
export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("block text-xs font-semibold text-[#1E1E1E] mb-1.5 select-none", className)}
      {...props}
    />
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "w-full h-11 px-4 text-sm bg-white border border-[#E4E4E7] rounded-2xl text-[#1E1E1E] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#1E1E1E] focus:ring-1 focus:ring-[#1E1E1E] transition-all disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full p-3.5 text-sm bg-white border border-[#E4E4E7] rounded-2xl text-[#1E1E1E] placeholder:text-[#A1A1AA] focus:outline-none focus:border-[#1E1E1E] focus:ring-1 focus:ring-[#1E1E1E] transition-all disabled:opacity-50 min-h-[90px]",
          className
        )}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

// Grid / List View Toggle
export function ViewToggle({
  view,
  onChange,
  className,
}: {
  view: "grid" | "list";
  onChange: (v: "grid" | "list") => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex p-1 bg-[#F4F4F6] border border-[#E4E4E7] rounded-full", className)}>
      <button
        type="button"
        onClick={() => onChange("grid")}
        className={cn(
          "p-2 rounded-full text-xs font-medium transition-all cursor-pointer",
          view === "grid" ? "bg-[#1E1E1E] text-white shadow-2xs" : "text-[#71717A] hover:text-[#1E1E1E]"
        )}
        aria-label="Grid view"
      >
        <LayoutGrid className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "p-2 rounded-full text-xs font-medium transition-all cursor-pointer",
          view === "list" ? "bg-[#1E1E1E] text-white shadow-2xs" : "text-[#71717A] hover:text-[#1E1E1E]"
        )}
        aria-label="List view"
      >
        <List className="w-4 h-4" />
      </button>
    </div>
  );
}

// Sort Dropdown
export function SortDropdown({
  options,
  selected,
  onSelect,
  className,
}: {
  options: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const activeLabel = options.find((o) => o.id === selected)?.label || "Sort by";

  return (
    <div className={cn("relative inline-block text-left", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white border border-[#E4E4E7] hover:border-[#D4D4D8] text-[#1E1E1E] rounded-full shadow-2xs cursor-pointer"
      >
        <span>{activeLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white border border-[#E4E4E7] shadow-xl p-1.5 z-40">
            {options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onSelect(opt.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-xl text-left transition-colors cursor-pointer",
                  opt.id === selected ? "bg-[#F4F4F6] text-[#1E1E1E] font-bold" : "text-[#71717A] hover:bg-[#FAFAFB]"
                )}
              >
                {opt.label}
                {opt.id === selected && <Check className="w-3.5 h-3.5 text-[#1E1E1E]" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Date & Time Picker
export function DateTimePicker({
  selectedDate,
  selectedTime,
  onDateChange,
  onTimeChange,
}: {
  selectedDate: string;
  selectedTime: string;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string) => void;
}) {
  const timeSlots = [
    "09:00 AM",
    "10:00 AM",
    "11:00 AM",
    "12:00 PM",
    "01:30 PM",
    "02:30 PM",
    "03:30 PM",
    "04:30 PM",
    "05:30 PM",
  ];

  return (
    <div className="space-y-4">
      <div>
        <Label>Select Appointment Date</Label>
        <div className="relative">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="pl-10"
          />
          <CalendarIcon className="w-4 h-4 text-[#71717A] absolute left-3.5 top-3.5 pointer-events-none" />
        </div>
      </div>

      <div>
        <Label>Available Time Slots (Accra GMT)</Label>
        <div className="grid grid-cols-3 gap-2">
          {timeSlots.map((slot) => {
            const isSelected = selectedTime === slot;
            return (
              <button
                key={slot}
                type="button"
                onClick={() => onTimeChange(slot)}
                className={cn(
                  "py-2 px-2.5 text-xs font-medium rounded-xl border transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                  isSelected
                    ? "bg-[#1E1E1E] text-white border-[#1E1E1E] shadow-2xs"
                    : "bg-white text-[#1E1E1E] border-[#E4E4E7] hover:border-[#D4D4D8]"
                )}
              >
                <Clock className="w-3 h-3 text-current/60" />
                {slot}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Toast notification component
export function Toast({
  title,
  message,
  onClose,
}: {
  title: string;
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-[#1E1E1E] text-white shadow-2xl border border-white/10 max-w-sm">
      <div>
        <h4 className="text-xs font-bold">{title}</h4>
        <p className="text-xs text-white/70 mt-0.5">{message}</p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-white/60 hover:text-white text-xs font-medium cursor-pointer"
        >
          Dismiss
        </button>
      )}
    </div>
  );
}
