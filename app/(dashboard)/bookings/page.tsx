"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  List as ListIcon,
  Search,
  ChevronLeft,
  ChevronRight,
  Radio,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookingCalendarView } from "@/components/bookings/calendar-view";
import { BookingListView } from "@/components/bookings/list-view";
import { BookingDrawer } from "@/components/bookings/booking-drawer";
import { BookingRecord, BookingStaff, BookingFilters } from "@/components/bookings/types";

function BookingsContent() {
  const [staffList, setStaffList] = React.useState<BookingStaff[]>([]);
  const [servicesList, setServicesList] = React.useState<Array<{ id: string; name: string }>>([]);

  const [filters, setFilters] = React.useState<BookingFilters>({
    viewMode: "calendar",
    calendarSubView: "day",
    selectedDate: "",
    status: "ALL",
    staffId: "ALL",
    serviceId: "ALL",
    source: "ALL",
    paymentStatus: "ALL",
    search: "",
    page: 1,
    limit: 25,
  });

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const today = new Date().toISOString().split("T")[0];
      setFilters((prev) => ({
        ...prev,
        selectedDate: prev.selectedDate || today,
      }));
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const [loading, setLoading] = React.useState(true);
  const [bookings, setBookings] = React.useState<BookingRecord[]>([]);
  const [total, setTotal] = React.useState(0);
  const [totalPages, setTotalPages] = React.useState(1);
  const [stats, setStats] = React.useState({
    total: 0,
    confirmed: 0,
    checkedIn: 0,
    completed: 0,
    cancelled: 0,
    pendingPayment: 0,
    noShow: 0,
  });

  const [selectedBookingId, setSelectedBookingId] = React.useState<string | null>(null);
  const [sseConnected, setSseConnected] = React.useState(false);
  const [refreshTrigger, setRefreshTrigger] = React.useState(0);

  // 1. Fetch current staff & services list
  React.useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const staffRes = await fetch("/api/admin/staff").catch(() => null);

        if (!ignore && staffRes && staffRes.ok) {
          const json = await staffRes.json();
          if (json.success && json.data) {
            if (Array.isArray(json.data.staff)) {
              setStaffList(json.data.staff);
            }
            if (Array.isArray(json.data.services)) {
              setServicesList(
                json.data.services.map((s: { id: string; name: string }) => ({
                  id: s.id,
                  name: s.name,
                }))
              );
            }
          }
        }
      } catch {
        // silent
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, []);

  // 2. Fetch Bookings based on filters
  React.useEffect(() => {
    let ignore = false;
    async function load() {
      try {
        const params = new URLSearchParams();

        if (filters.viewMode === "calendar") {
          const dateToUse = filters.selectedDate || new Date().toISOString().split("T")[0];
          if (filters.calendarSubView === "day" || filters.calendarSubView === "staff") {
            params.set("startDate", `${dateToUse}T00:00:00.000Z`);
            params.set("endDate", `${dateToUse}T23:59:59.999Z`);
          } else if (filters.calendarSubView === "week") {
            const base = new Date(dateToUse);
            const day = base.getUTCDay();
            const dist = (day + 6) % 7;
            const mon = new Date(base);
            mon.setUTCDate(base.getUTCDate() - dist);
            const sun = new Date(mon);
            sun.setUTCDate(mon.getUTCDate() + 6);
            params.set("startDate", `${mon.toISOString().split("T")[0]}T00:00:00.000Z`);
            params.set("endDate", `${sun.toISOString().split("T")[0]}T23:59:59.999Z`);
          }
          params.set("limit", "100");
        } else {
          // List View: paginated query across bookings
          params.set("page", String(filters.page));
          params.set("limit", String(filters.limit));
        }

        if (filters.status !== "ALL") params.set("status", filters.status);
        if (filters.staffId !== "ALL") params.set("staffId", filters.staffId);
        if (filters.serviceId !== "ALL") params.set("serviceId", filters.serviceId);
        if (filters.source !== "ALL") params.set("source", filters.source);
        if (filters.paymentStatus !== "ALL") params.set("paymentStatus", filters.paymentStatus);
        if (filters.search.trim()) params.set("search", filters.search.trim());

        const res = await fetch(`/api/admin/bookings?${params.toString()}`);
        if (!ignore && res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setBookings(json.data.bookings || []);
            setTotal(json.data.total || 0);
            setTotalPages(json.data.totalPages || 1);
            if (json.data.stats) setStats(json.data.stats);
          }
        }
      } catch {
        // quiet error
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      ignore = true;
    };
  }, [filters, refreshTrigger]);

  // 3. Real-Time Server-Sent Events (SSE) Listener
  React.useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/admin/bookings/events");
      es.onopen = () => {
        setSseConnected(true);
      };
      es.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.type !== "CONNECTED") {
            setRefreshTrigger((prev) => prev + 1);
          }
        } catch {
          // ignore non-json pings
        }
      };
      es.onerror = () => {
        setSseConnected(false);
      };
    } catch {
      // quiet
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, []);

  // Drag-to-Reschedule handler
  const handleReschedule = async (
    bookingId: string,
    newStartUtc: string,
    newEndUtc: string,
    newStaffId?: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newStartUtc,
          newEndUtc,
          newStaffId,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setRefreshTrigger((prev) => prev + 1);
        return { success: true };
      }
      return {
        success: false,
        error: json.error?.message || "Rescheduling conflict or error",
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Network error during reschedule",
      };
    }
  };

  // Date navigation
  const adjustDate = (days: number) => {
    const current = new Date(filters.selectedDate);
    current.setUTCDate(current.getUTCDate() + days);
    setFilters((prev) => ({
      ...prev,
      selectedDate: current.toISOString().split("T")[0],
    }));
  };

  return (
    <AppShell activePath="/bookings" userName="Akosua">
      <div className="max-w-7xl mx-auto space-y-6 pb-16">
        {/* TOP BAR: Title, Live Sync Status, View Toggles */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-black text-[#1E1E1E] tracking-tight">
                Appointments & Bookings
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  sseConnected
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-zinc-100 text-zinc-600 border border-zinc-300"
                }`}
              >
                <Radio className={`w-3 h-3 ${sseConnected ? "animate-pulse text-emerald-600" : ""}`} />
                <span>{sseConnected ? "Live Sync" : "Syncing"}</span>
              </span>
            </div>
            <p className="text-xs text-[#71717A] mt-0.5">
              Manage salon appointments, calendar schedules, client check-ins and studio operations
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher (Calendar vs List) */}
            <div className="p-1 rounded-full bg-zinc-200/80 flex items-center gap-1 border border-black/5">
              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, viewMode: "calendar" }))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  filters.viewMode === "calendar"
                    ? "bg-[#1E1E1E] text-white shadow-xs"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5" />
                <span>Calendar</span>
              </button>

              <button
                type="button"
                onClick={() => setFilters((prev) => ({ ...prev, viewMode: "list" }))}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  filters.viewMode === "list"
                    ? "bg-[#1E1E1E] text-white shadow-xs"
                    : "text-zinc-600 hover:text-black"
                }`}
              >
                <ListIcon className="w-3.5 h-3.5" />
                <span>List View</span>
              </button>
            </div>
          </div>
        </div>

        {/* STATS TILES (Quick glance summary) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">Total</span>
            <div className="text-xl font-black text-[#1E1E1E]">{stats.total}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 block">Confirmed</span>
            <div className="text-xl font-black text-emerald-900">{stats.confirmed}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-600 block">Checked In</span>
            <div className="text-xl font-black text-zinc-800">{stats.checkedIn}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-700 block">Completed</span>
            <div className="text-xl font-black text-[#1E1E1E]">{stats.completed}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 block">Pending Pay</span>
            <div className="text-xl font-black text-amber-900">{stats.pendingPayment}</div>
          </div>
          <div className="p-3.5 rounded-2xl bg-white border border-black/10 shadow-xs space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">Cancelled</span>
            <div className="text-xl font-black text-rose-800">{stats.cancelled}</div>
          </div>
        </div>

        {/* FILTER BAR & CONTROLS */}
        <Card variant="white" className="p-4 rounded-3xl border border-black/10 shadow-xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Calendar Controls (if calendar mode) */}
            {filters.viewMode === "calendar" ? (
              <div className="flex flex-wrap items-center gap-2">
                {/* Subview Pills */}
                <div className="p-1 rounded-full bg-zinc-100 flex items-center gap-1 border border-zinc-200">
                  <button
                    type="button"
                    onClick={() => setFilters((p) => ({ ...p, calendarSubView: "day" }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      filters.calendarSubView === "day"
                        ? "bg-[#1E1E1E] text-white shadow-xs"
                        : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    Day
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters((p) => ({ ...p, calendarSubView: "week" }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      filters.calendarSubView === "week"
                        ? "bg-[#1E1E1E] text-white shadow-xs"
                        : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    Week
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilters((p) => ({ ...p, calendarSubView: "staff" }))}
                    className={`px-3 py-1 rounded-full text-xs font-bold cursor-pointer transition-all ${
                      filters.calendarSubView === "staff"
                        ? "bg-[#1E1E1E] text-white shadow-xs"
                        : "text-zinc-600 hover:text-black"
                    }`}
                  >
                    Per-Staff Columns
                  </button>
                </div>

                {/* Date Navigator */}
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="outlinePill"
                    onClick={() => adjustDate(-1)}
                    className="h-8 w-8 p-0 cursor-pointer bg-white"
                    aria-label="Previous day"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>

                  <input
                    type="date"
                    value={filters.selectedDate}
                    onChange={(e) => setFilters((p) => ({ ...p, selectedDate: e.target.value }))}
                    className="text-xs font-bold p-1.5 px-3 rounded-full border border-zinc-300 bg-white"
                  />

                  <Button
                    size="sm"
                    variant="outlinePill"
                    onClick={() => adjustDate(1)}
                    className="h-8 w-8 p-0 cursor-pointer bg-white"
                    aria-label="Next day"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>

                  <Button
                    size="sm"
                    variant="outlinePill"
                    onClick={() => {
                      const today = new Date().toISOString().split("T")[0];
                      setFilters((p) => ({ ...p, selectedDate: today }));
                    }}
                    className="text-xs font-bold h-8 px-3 cursor-pointer bg-white"
                  >
                    Today
                  </Button>
                </div>
              </div>
            ) : (
              /* Search Bar in List Mode */
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by client name, +233 phone, or BK-XXXX..."
                  value={filters.search}
                  onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value, page: 1 }))}
                  className="w-full text-xs pl-9 pr-3 py-2 rounded-full border border-zinc-300 bg-white focus:outline-none focus:border-black"
                />
              </div>
            )}

            {/* Common Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status Filter */}
              <select
                value={filters.status}
                onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))}
                className="text-xs p-1.5 px-3 rounded-full border border-zinc-300 bg-white font-medium cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="CHECKED_IN">Checked In</option>
                <option value="COMPLETED">Completed</option>
                <option value="PENDING_PAYMENT">Pending Payment</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>

              {/* Staff Filter (if viewing all allowed) */}
              <select
                value={filters.staffId}
                onChange={(e) => setFilters((p) => ({ ...p, staffId: e.target.value, page: 1 }))}
                className="text-xs p-1.5 px-3 rounded-full border border-zinc-300 bg-white font-medium cursor-pointer"
              >
                <option value="ALL">All Stylists</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Service Filter */}
              <select
                value={filters.serviceId}
                onChange={(e) => setFilters((p) => ({ ...p, serviceId: e.target.value, page: 1 }))}
                className="text-xs p-1.5 px-3 rounded-full border border-zinc-300 bg-white font-medium cursor-pointer"
              >
                <option value="ALL">All Services</option>
                {servicesList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Reset Filters */}
              {(filters.status !== "ALL" ||
                filters.staffId !== "ALL" ||
                filters.serviceId !== "ALL" ||
                filters.search !== "") && (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((p) => ({
                      ...p,
                      status: "ALL",
                      staffId: "ALL",
                      serviceId: "ALL",
                      source: "ALL",
                      paymentStatus: "ALL",
                      search: "",
                      page: 1,
                    }))
                  }
                  className="text-xs text-zinc-500 hover:text-black font-semibold underline px-2 cursor-pointer"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </Card>

        {/* MAIN VIEW CONTENT */}
        {loading && bookings.length === 0 ? (
          <div className="py-24 text-center space-y-3 bg-white rounded-3xl border border-black/10">
            <div className="w-8 h-8 border-3 border-black border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-zinc-500">Loading appointments and schedules...</p>
          </div>
        ) : filters.viewMode === "calendar" ? (
          <BookingCalendarView
            subView={filters.calendarSubView}
            selectedDate={filters.selectedDate}
            bookings={bookings}
            staffList={staffList}
            onSelectBooking={(id) => setSelectedBookingId(id)}
            onReschedule={handleReschedule}
          />
        ) : (
          <BookingListView
            bookings={bookings}
            total={total}
            page={filters.page}
            totalPages={totalPages}
            onPageChange={(p) => setFilters((prev) => ({ ...prev, page: p }))}
            onSelectBooking={(id) => setSelectedBookingId(id)}
          />
        )}

        {/* BOOKING DETAIL DRAWER */}
        {selectedBookingId && (
          <BookingDrawer
            bookingId={selectedBookingId}
            onClose={() => setSelectedBookingId(null)}
            onRefresh={() => setRefreshTrigger((prev) => prev + 1)}
            staffList={staffList}
          />
        )}
      </div>
    </AppShell>
  );
}

export default function BookingsPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-sm text-zinc-500">Loading bookings...</div>}>
      <BookingsContent />
    </React.Suspense>
  );
}

