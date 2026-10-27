"use client";

import * as React from "react";
import { Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChecklistItem {
  id: string;
  label: string;
  subtitle?: string;
  completed?: boolean;
}

interface ChecklistProps {
  items: ChecklistItem[];
  onToggle: (id: string) => void;
  className?: string;
}

export function Checklist({ items, onToggle, className }: ChecklistProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item) => (
        <div
          key={item.id}
          onClick={() => onToggle(item.id)}
          className={cn(
            "flex items-center gap-3 p-3.5 rounded-2xl border transition-all cursor-pointer select-none",
            item.completed
              ? "bg-[#F9F9FB] border-[#E4E4E7] opacity-75"
              : "bg-white border-[#E4E4E7] hover:border-[#D4D4D8] shadow-2xs"
          )}
        >
          <div
            className={cn(
              "w-5 h-5 rounded-md flex items-center justify-center border transition-colors shrink-0",
              item.completed
                ? "bg-[#1E1E1E] border-[#1E1E1E] text-white"
                : "border-[#D4D4D8] bg-white hover:border-[#1E1E1E]"
            )}
          >
            {item.completed && <Check className="w-3.5 h-3.5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium text-[#1E1E1E]",
                item.completed && "line-through text-[#71717A]"
              )}
            >
              {item.label}
            </p>
            {item.subtitle && (
              <p className="text-xs text-[#71717A] truncate">{item.subtitle}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

interface DashedAddCardProps {
  label: string;
  description?: string;
  onClick: () => void;
  className?: string;
}

export function DashedAddCard({
  label,
  description,
  onClick,
  className,
}: DashedAddCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex flex-col items-center justify-center p-8 rounded-[26px] border-2 border-dashed border-[#D4D4D8] hover:border-[#1E1E1E] bg-white/40 hover:bg-white/80 transition-all cursor-pointer text-center w-full",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-[#F4F4F6] group-hover:bg-[#1E1E1E] group-hover:text-white flex items-center justify-center transition-colors mb-3 text-[#1E1E1E]">
        <Plus className="w-6 h-6 transition-transform group-hover:rotate-90 duration-200" />
      </div>
      <span className="text-sm font-bold text-[#1E1E1E] group-hover:text-black">
        {label}
      </span>
      {description && (
        <span className="text-xs text-[#71717A] mt-1 max-w-xs">{description}</span>
      )}
    </button>
  );
}
