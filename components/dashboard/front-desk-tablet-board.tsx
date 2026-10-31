"use client";

import * as React from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState, Skeleton } from "@/components/ui/controls";
import {
  Calendar,
  CalendarPlus,
  CreditCard,
  Users,
  Phone,
  Clock,
  Check,
  Search,
  RefreshCw,
  Send,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatPesewas } from "@/lib/money";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  timeFormatted: string;
  staffName: string;
  status: string;
  completed: boolean;
  totalPesewas: number;
  amountPaidPesewas: number;
}

interface PendingPaymentItem {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  amountPendingPesewas: number;
  totalPesewas: number;
  depositRequiredPesewas: number;
  timeFormatted: string;
  staffName: string;
  status: string;
}

interface LatestBookingItem {
  id: string;
  reference: string;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  categoryName: string;
  staffName: string;
  startUtc: string;
  timeFormatted: string;
  totalPesewas: number;
  amountPaidPesewas: number;
  status: string;
  source: string;
}

interface FrontDeskTabletBoardProps {
  todayChecklist: ChecklistItem[];
  pendingPayments: PendingPaymentItem[];
  latestBookings: LatestBookingItem[];
  loading: boolean;
  onToggleComplete: (bookingId: string) => void;
  onSendReminder: (bookingId: string) => void;
  onRefresh: () => void;
}

export function FrontDeskTabletBoard({
  todayChecklist,
  pendingPayments,
  latestBookings,
  loading,
  onToggleComplete,
  onSendReminder,
  onRefresh,
}: FrontDeskTabletBoardProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterTab, setFilterTab] = React.useState<"all" | "active" | "balance_due" | "completed">("all");
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefresh();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Filter today's appointments
  const filteredAppointments = React.useMemo(() => {
    return todayChecklist.filter((item) => {
      // Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        item.customerName.toLowerCase().includes(query) ||
        item.customerPhone.includes(query) ||
        item.serviceName.toLowerCase().includes(query) ||
        item.reference.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      const hasBalance = item.totalPesewas > item.amountPaidPesewas;

      if (filterTab === "active") {
        return !item.completed;
      }
      if (filterTab === "balance_due") {
        return hasBalance;
      }
      if (filterTab === "completed") {
        return item.completed;
      }
      return true;
    });
  }, [todayChecklist, searchQuery, filterTab]);

  const completedCount = todayChecklist.filter((c) => c.completed).length;
  const activeCount = todayChecklist.filter((c) => !c.completed).length;
  const balanceDueCount = todayChecklist.filter((c) => c.totalPesewas > c.amountPaidPesewas).length;

  return (
    <div className="space-y-6">
      {/* 1. FRONT DESK TABLET QUICK ACTION RIBBON */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Quick New Booking */}
        <Link
          href="/bookings"
          className="p-4 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs hover:border-[#1E1E1E] hover:shadow-md transition-all flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200/60 group-hover:scale-105 transition-transform">
            <CalendarPlus className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#1E1E1E] leading-tight">New Booking</h4>
            <p className="text-[11px] text-[#71717A] mt-0.5 truncate">Book client slot</p>
          </div>
        </Link>

        {/* Walk-in POS Register */}
        <Link
          href="/pos"
          className="p-4 rounded-3xl bg-[#1E1E1E] text-white shadow-md hover:bg-black hover:shadow-lg transition-all flex items-center gap-3.5 group cursor-pointer border border-black"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/10 text-emerald-400 flex items-center justify-center shrink-0 border border-white/15 group-hover:scale-105 transition-transform">
            <CreditCard className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-white leading-tight">Walk-in POS</h4>
            <p className="text-[11px] text-zinc-300 mt-0.5 truncate">Instant sale & register</p>
          </div>
        </Link>

        {/* Customers Lookup */}
        <Link
          href="/customers"
          className="p-4 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs hover:border-[#1E1E1E] hover:shadow-md transition-all flex items-center gap-3.5 group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200/60 group-hover:scale-105 transition-transform">
            <Users className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#1E1E1E] leading-tight">Clients</h4>
            <p className="text-[11px] text-[#71717A] mt-0.5 truncate">Contact & history</p>
          </div>
        </Link>

        {/* Live Refresh Board */}
        <button
          type="button"
          onClick={handleRefreshClick}
          className="p-4 rounded-3xl bg-white border border-[#E4E4E7] shadow-xs hover:border-[#1E1E1E] hover:shadow-md transition-all flex items-center gap-3.5 text-left group cursor-pointer"
        >
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 text-[#1E1E1E] flex items-center justify-center shrink-0 border border-zinc-200 group-hover:scale-105 transition-transform">
            <RefreshCw className={cn("w-6 h-6", isRefreshing && "animate-spin")} />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-[#1E1E1E] leading-tight">Refresh</h4>
            <p className="text-[11px] text-[#71717A] mt-0.5 truncate">Sync live status</p>
          </div>
        </button>
      </div>

      {/* 2. MAIN OPERATIONAL SCHEDULE & APPOINTMENTS BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Live Appointments Board (8 Cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Card variant="white" className="p-5 sm:p-6 shadow-sm rounded-3xl border border-[#E4E4E7]">
            {/* Board Header & Live Counters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F4F4F6]">
              <div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-[#1E1E1E]" />
                  <h3 className="text-base font-extrabold text-[#1E1E1E] tracking-tight">
                    Today&apos;s Appointments
                  </h3>
                </div>
                <p className="text-xs text-[#71717A] mt-0.5">
                  {todayChecklist.length} clients scheduled today &bull; {completedCount} completed
                </p>
              </div>

              {/* Status Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                    filterTab === "all"
                      ? "bg-[#1E1E1E] text-white shadow-xs"
                      : "bg-[#F4F4F6] text-[#71717A] hover:text-[#1E1E1E]"
                  )}
                >
                  All ({todayChecklist.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("active")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                    filterTab === "active"
                      ? "bg-[#1E1E1E] text-white shadow-xs"
                      : "bg-[#F4F4F6] text-[#71717A] hover:text-[#1E1E1E]"
                  )}
                >
                  To Do ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("balance_due")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                    filterTab === "balance_due"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  )}
                >
                  Balance Due ({balanceDueCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab("completed")}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer",
                    filterTab === "completed"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  )}
                >
                  Done ({completedCount})
                </button>
              </div>
            </div>

            {/* Live Search Bar for Receptionist */}
            <div className="relative my-4">
              <Search className="w-4 h-4 text-[#A1A1AA] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search today's clients by name, phone number, service..."
                className="w-full h-11 pl-10 pr-4 text-xs sm:text-sm bg-[#F4F4F6] border border-[#E4E4E7] rounded-2xl text-[#1E1E1E] focus:outline-none focus:border-[#1E1E1E] transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#71717A] hover:text-[#1E1E1E]"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Appointments List for Tablet */}
            {loading ? (
              <div className="space-y-3 py-2">
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </div>
            ) : filteredAppointments.length === 0 ? (
              <div className="py-12 text-center">
                <EmptyState
                  title={searchQuery ? "No matching appointments" : "No appointments scheduled"}
                  description={
                    searchQuery
                      ? "Try searching with a different name or phone number."
                      : "The studio schedule is currently clear. Use 'New Booking' or 'Walk-in POS' to schedule a client."
                  }
                />
              </div>
            ) : (
              <div className="divide-y divide-[#F4F4F6] space-y-1">
                {filteredAppointments.map((item) => {
                  const hasBalance = item.totalPesewas > item.amountPaidPesewas;
                  const balancePesewas = item.totalPesewas - item.amountPaidPesewas;

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "py-4 px-3 rounded-2xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                        item.completed
                          ? "bg-[#FAFAFB] opacity-65"
                          : "hover:bg-[#F4F4F6]/60 bg-white"
                      )}
                    >
                      {/* Left: Time, Customer & Service Info */}
                      <div className="flex items-start gap-3 min-w-0">
                        {/* Check-In / Complete Toggle Button */}
                        <button
                          type="button"
                          onClick={() => onToggleComplete(item.id)}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 cursor-pointer transition-colors shadow-xs",
                            item.completed
                              ? "bg-[#1E1E1E] border-[#1E1E1E] text-white"
                              : "border-[#D4D4D8] hover:border-[#1E1E1E] bg-white text-transparent"
                          )}
                          title={item.completed ? "Mark incomplete" : "Check-in / Complete appointment"}
                          aria-label={`Toggle completion for ${item.customerName}`}
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                        </button>

                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-extrabold text-[#1E1E1E]">
                              {item.customerName}
                            </span>
                            <span className="text-[11px] text-[#71717A] font-mono">
                              ({item.reference})
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#71717A]">
                            <span className="font-semibold text-zinc-900">{item.serviceName}</span>
                            <span>&bull;</span>
                            <a
                              href={`tel:${item.customerPhone}`}
                              className="inline-flex items-center gap-1 font-semibold text-zinc-700 hover:text-black hover:underline"
                            >
                              <Phone className="w-3 h-3 text-[#71717A]" />
                              <span>{item.customerPhone}</span>
                            </a>
                          </div>

                          <div className="flex items-center gap-2 text-[11px] text-[#A1A1AA] pt-0.5">
                            <span className="inline-flex items-center gap-1 font-mono font-semibold text-[#1E1E1E]">
                              <Clock className="w-3 h-3 text-[#71717A]" />
                              {item.timeFormatted}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Payment Status & 1-Tap Operational Actions */}
                      <div className="flex sm:flex-col items-end justify-between sm:justify-center gap-2 shrink-0">
                        <div className="text-right">
                          <span className="text-sm font-black font-poppins text-[#1E1E1E] block">
                            {formatPesewas(item.totalPesewas)}
                          </span>
                          {hasBalance ? (
                            <span className="text-[11px] font-bold font-poppins text-amber-700 block">
                              Due: {formatPesewas(balancePesewas)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold text-emerald-700 block">
                              Paid in Full
                            </span>
                          )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5">
                          {hasBalance && (
                            <Link href="/pos">
                              <Button
                                variant="blackPill"
                                size="sm"
                                className="h-8 px-3 text-[11px] gap-1 cursor-pointer"
                                title="Collect balance in POS"
                              >
                                <CreditCard className="w-3 h-3" />
                                <span>POS Settle</span>
                              </Button>
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => onSendReminder(item.id)}
                            className="p-1.5 rounded-full border border-[#E4E4E7] text-[#71717A] hover:text-[#1E1E1E] hover:bg-white transition-colors cursor-pointer"
                            title="Send SMS Payment Link / Reminder"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Pending Balances & Walk-in Queue (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Pending Balances Ready for Checkout */}
          <Card variant="white" className="p-5 shadow-sm rounded-3xl border border-[#E4E4E7]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F4F4F6]">
              <div>
                <h4 className="text-xs font-extrabold text-[#1E1E1E] uppercase tracking-wider">
                  Pending Balances
                </h4>
                <p className="text-[11px] text-[#71717A]">Clients needing checkout</p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-bold">
                {pendingPayments.length} Due
              </span>
            </div>

            {loading ? (
              <div className="space-y-2.5 py-3">
                <Skeleton className="h-16 rounded-2xl" />
                <Skeleton className="h-16 rounded-2xl" />
              </div>
            ) : pendingPayments.length === 0 ? (
              <p className="py-6 text-center text-xs text-[#71717A]">
                All client balances are settled for today!
              </p>
            ) : (
              <div className="divide-y divide-[#F4F4F6] mt-1 space-y-2">
                {pendingPayments.map((p) => (
                  <div key={p.id} className="pt-3 pb-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#1E1E1E] truncate">{p.customerName}</p>
                      <p className="text-[11px] text-[#71717A] truncate">{p.serviceName}</p>
                      <p className="text-[10px] font-semibold text-[#A1A1AA]">{p.customerPhone}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <p className="text-xs font-black font-poppins text-amber-700">
                        {formatPesewas(p.amountPendingPesewas)}
                      </p>
                      <Link href="/pos" className="mt-1 inline-block">
                        <Button
                          variant="outlinePill"
                          size="sm"
                          className="h-7 text-[10px] px-2.5 gap-1 cursor-pointer"
                        >
                          <span>Checkout</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Direct Link to Bookings & POS */}
          <div className="p-5 rounded-3xl bg-zinc-950 text-white shadow-md space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-zinc-300">
                Tablet Front Desk Terminal
              </h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Designed for live studio reception: check clients in, book appointments, and collect walk-in sales at the front counter.
            </p>
            <div className="pt-1 flex gap-2">
              <Link href="/pos" className="flex-1">
                <Button variant="blackPill" size="sm" className="w-full bg-white text-zinc-950 hover:bg-zinc-100 text-xs font-bold">
                  Open Register
                </Button>
              </Link>
              <Link href="/bookings" className="flex-1">
                <Button variant="outlinePill" size="sm" className="w-full border-zinc-700 text-white hover:bg-white/10 text-xs font-bold">
                  All Bookings
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
