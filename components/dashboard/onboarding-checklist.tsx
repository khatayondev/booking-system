"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  CheckCircle2,
  Circle,
  Crown,
  ArrowRight,
  Clock,
  Scissors,
  Users,
  CreditCard,
  MessageSquare,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ChecklistTask {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
}

const TASKS: ChecklistTask[] = [
  {
    id: "hours",
    title: "1. Configure Studio Hours & Location",
    description: "Set opening hours, break intervals, holidays, and Google Maps pin in East Legon.",
    href: "/settings",
    icon: Clock,
  },
  {
    id: "catalog",
    title: "2. Define Treatments & Services",
    description: "Add beauty treatments, lash styles, and couture gown rental catalog with pricing.",
    href: "/services",
    icon: Scissors,
  },
  // Solo direct shop mode: Stylist onboarding omitted for direct operation
  // {
  //   id: "staff",
  //   title: "3. Onboard Stylists & Schedules",
  //   description: "Add staff team members, assign services, and establish weekly working shifts.",
  //   href: "/staff",
  //   icon: Users,
  // },
  {
    id: "paystack",
    title: "4. Connect Paystack Live Keys",
    description: "Enter your Paystack Ghana public and secret API keys to enable Card & Mobile Money.",
    href: "/settings",
    icon: CreditCard,
  },
  {
    id: "sms",
    title: "5. Review Automated SMS Templates",
    description: "Customize 24h & 2h reminder templates, sender ID, and WhatsApp notifications.",
    href: "/settings",
    icon: MessageSquare,
  },
  {
    id: "test_booking",
    title: "6. Complete First Test Booking",
    description: "Visit the public booking wizard, hold a slot, and verify the checkout experience.",
    href: "/book",
    icon: Calendar,
  },
];

export function OwnerOnboardingChecklist() {
  const [completedIds, setCompletedIds] = React.useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("aura_owner_onboarding_completed");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isDismissed, setIsDismissed] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("aura_owner_onboarding_dismissed") === "true";
    } catch {
      return false;
    }
  });

  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(false);

  const toggleTask = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = completedIds.includes(id)
      ? completedIds.filter((item) => item !== id)
      : [...completedIds, id];

    setCompletedIds(updated);
    try {
      localStorage.setItem("aura_owner_onboarding_completed", JSON.stringify(updated));
    } catch {
      // quiet
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem("aura_owner_onboarding_dismissed", "true");
    } catch {
      // quiet
    }
  };

  if (isDismissed) return null;

  const total = TASKS.length;
  const completedCount = completedIds.length;
  const progressPercent = Math.round((completedCount / total) * 100);

  return (
    <Card className="p-5 sm:p-6 rounded-3xl bg-white border border-[#E4E4E7] shadow-sm relative overflow-hidden space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#1E1E1E] text-white flex items-center justify-center shadow-xs shrink-0">
            <Crown className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E]">
                Owner Launch Checklist
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#1E1E1E] text-white uppercase tracking-wider">
                {completedCount}/{total} Complete
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">
              Follow these recommended milestones to complete your studio setup before accepting live public bookings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-xl hover:bg-[#F4F4F6] text-[#71717A] transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-xl hover:bg-[#F4F4F6] text-[#71717A] transition-colors"
            title="Dismiss checklist"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="w-full h-2 rounded-full bg-[#E4E4E7] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#1E1E1E] transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Tasks List */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
          {TASKS.map((task) => {
            const isDone = completedIds.includes(task.id);
            const Icon = task.icon;

            return (
              <div
                key={task.id}
                className={`p-3.5 rounded-2xl border transition-all flex items-start gap-3 ${
                  isDone
                    ? "bg-[#F4F4F6]/60 border-[#E4E4E7]"
                    : "bg-white border-[#E4E4E7] hover:border-[#1E1E1E] hover:shadow-xs"
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => toggleTask(task.id, e)}
                  className="mt-0.5 shrink-0 text-[#71717A] hover:text-[#1E1E1E] transition-colors"
                  title={isDone ? "Mark incomplete" : "Mark complete"}
                >
                  {isDone ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <Circle className="w-5 h-5 text-[#A1A1AA]" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <Icon className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                      <p
                        className={`text-xs font-bold truncate ${
                          isDone ? "line-through text-[#71717A]" : "text-[#1E1E1E]"
                        }`}
                      >
                        {task.title}
                      </p>
                    </div>
                    <Link
                      href={task.href}
                      className="shrink-0 text-[11px] font-semibold text-[#1E1E1E] hover:underline flex items-center gap-0.5"
                    >
                      <span>Open</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <p className="text-[11px] text-[#71717A] mt-0.5 line-clamp-2">
                    {task.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
