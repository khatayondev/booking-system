"use client";

import * as React from "react";
import { Clock, User, Scissors, AlertTriangle } from "lucide-react";
import { BookingRecord, BookingStaff } from "./types";
import { BookingStatusBadge } from "./status-badge";
import { formatPesewas } from "@/lib/money";

interface CalendarViewProps {
  subView: "day" | "week" | "staff";
  selectedDate: string; // YYYY-MM-DD
  bookings: BookingRecord[];
  staffList: BookingStaff[];
  onSelectBooking: (id: string) => void;
  onReschedule: (bookingId: string, newStartUtc: string, newEndUtc: string, newStaffId?: string) => Promise<{ success: boolean; error?: string }>;
  canEdit?: boolean;
}

const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20];

export function BookingCalendarView({
  subView,
  selectedDate,
  bookings,
  staffList,
  onSelectBooking,
  onReschedule,
  canEdit = true,
}: CalendarViewProps) {
  const [draggedBooking, setDraggedBooking] = React.useState<BookingRecord | null>(null);
  const [dragOverSlot, setDragOverSlot] = React.useState<string | null>(null);
  const [conflictError, setConflictError] = React.useState<string | null>(null);

  const safeStaff = Array.isArray(staffList) ? staffList : [];

  // Compute dates for Week View (Monday to Sunday)
  const weekDays = React.useMemo(() => {
    let base = new Date();
    if (selectedDate && !isNaN(new Date(selectedDate).getTime())) {
      base = new Date(selectedDate);
    }
    const dayOfWeek = base.getUTCDay(); // 0 is Sunday
    const distanceToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(base);
    monday.setUTCDate(base.getUTCDate() - distanceToMonday);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const iso = d.toISOString().split("T")[0];
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getUTCDay()];
      return { iso, dayName, dayNum: d.getUTCDate() };
    });
  }, [selectedDate]);

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, booking: BookingRecord) => {
    if (!canEdit) return;
    setDraggedBooking(booking);
    setConflictError(null);
    e.dataTransfer.setData("text/plain", booking.id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, slotKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverSlot !== slotKey) {
      setDragOverSlot(slotKey);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetDateStr: string, hour: number, targetStaffId?: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    if (!draggedBooking) return;

    try {
      // Calculate target start time in UTC
      const start = new Date(targetDateStr);
      start.setUTCHours(hour, 0, 0, 0);

      // Preserve original booking duration
      const origStart = new Date(draggedBooking.startUtc).getTime();
      const origEnd = new Date(draggedBooking.endUtc).getTime();
      const durationMs = Math.max(30 * 60 * 1000, origEnd - origStart);

      const end = new Date(start.getTime() + durationMs);

      const result = await onReschedule(
        draggedBooking.id,
        start.toISOString(),
        end.toISOString(),
        targetStaffId
      );

      if (!result.success && result.error) {
        setConflictError(result.error);
      } else {
        setConflictError(null);
      }
    } catch (err) {
      setConflictError(err instanceof Error ? err.message : "Failed to reschedule");
    } finally {
      setDraggedBooking(null);
    }
  };

  return (
    <div className="space-y-3">
      {conflictError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-semibold">{conflictError}</span>
          </div>
          <button
            type="button"
            onClick={() => setConflictError(null)}
            className="text-xs underline font-bold cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 1. DAY VIEW */}
      {subView === "day" && (
        <div className="bg-white rounded-3xl border border-black/10 overflow-hidden shadow-xs">
          <div className="p-4 bg-zinc-50 border-b border-black/5 flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#1E1E1E]">
              Schedule for{" "}
              {new Date(selectedDate).toLocaleDateString("en-GB", {
                timeZone: "Africa/Accra",
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <span className="text-xs text-zinc-500 font-medium">
              {bookings.length} {bookings.length === 1 ? "Appointment" : "Appointments"}
            </span>
          </div>

          <div className="divide-y divide-zinc-100">
            {HOURS.map((hour) => {
              const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
              const slotKey = `day-${selectedDate}-${hour}`;
              const isDragOver = dragOverSlot === slotKey;

              // Filter bookings in this hour
              const slotBookings = bookings.filter((b) => {
                const bDate = b.startUtc.split("T")[0];
                const bHour = new Date(b.startUtc).getUTCHours();
                return bDate === selectedDate && bHour === hour;
              });

              return (
                <div
                  key={hour}
                  onDragOver={(e) => handleDragOver(e, slotKey)}
                  onDrop={(e) => handleDrop(e, selectedDate, hour)}
                  className={`flex min-h-[76px] transition-colors ${
                    isDragOver ? "bg-zinc-100 border-2 border-dashed border-black/30" : "hover:bg-zinc-50/50"
                  }`}
                >
                  <div className="w-18 p-3 border-r border-zinc-100 text-xs font-mono text-zinc-400 font-bold select-none shrink-0">
                    {hourLabel}
                  </div>
                  <div className="flex-1 p-2 flex flex-wrap gap-2 items-center">
                    {slotBookings.map((b) => (
                      <BookingCard
                        key={b.id}
                        booking={b}
                        canDrag={canEdit}
                        onDragStart={(e) => handleDragStart(e, b)}
                        onClick={() => onSelectBooking(b.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. WEEK VIEW */}
      {subView === "week" && (
        <div className="bg-white rounded-3xl border border-black/10 overflow-x-auto shadow-xs">
          <div className="min-w-[850px]">
            {/* Week Header */}
            <div className="grid grid-cols-8 border-b border-black/5 bg-zinc-50 text-center text-xs font-bold divide-x divide-zinc-200">
              <div className="p-3 text-zinc-400 font-mono">Time</div>
              {weekDays.map((d) => {
                const isSelected = d.iso === selectedDate;
                return (
                  <div
                    key={d.iso}
                    className={`p-3 ${isSelected ? "bg-[#1E1E1E] text-white" : "text-zinc-700"}`}
                  >
                    <div>{d.dayName}</div>
                    <div className="text-base font-black">{d.dayNum}</div>
                  </div>
                );
              })}
            </div>

            {/* Time Rows */}
            <div className="divide-y divide-zinc-100">
              {HOURS.map((hour) => {
                const hourLabel = `${hour.toString().padStart(2, "0")}:00`;
                return (
                  <div key={hour} className="grid grid-cols-8 divide-x divide-zinc-100 min-h-[70px]">
                    <div className="p-2 text-[11px] font-mono text-zinc-400 font-bold select-none text-center">
                      {hourLabel}
                    </div>

                    {weekDays.map((d) => {
                      const slotKey = `week-${d.iso}-${hour}`;
                      const isDragOver = dragOverSlot === slotKey;
                      const dayBookings = bookings.filter((b) => {
                        const bDate = b.startUtc.split("T")[0];
                        const bHour = new Date(b.startUtc).getUTCHours();
                        return bDate === d.iso && bHour === hour;
                      });

                      return (
                        <div
                          key={d.iso}
                          onDragOver={(e) => handleDragOver(e, slotKey)}
                          onDrop={(e) => handleDrop(e, d.iso, hour)}
                          className={`p-1.5 flex flex-col gap-1 transition-colors ${
                            isDragOver ? "bg-zinc-200 border border-dashed border-black" : "hover:bg-zinc-50/60"
                          }`}
                        >
                          {dayBookings.map((b) => (
                            <BookingCard
                              key={b.id}
                              booking={b}
                              compact
                              canDrag={canEdit}
                              onDragStart={(e) => handleDragStart(e, b)}
                              onClick={() => onSelectBooking(b.id)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. PER-STAFF COLUMNS VIEW */}
      {subView === "staff" && (
        <div className="bg-white rounded-3xl border border-black/10 overflow-x-auto shadow-xs">
          <div className="min-w-[900px]">
            {/* Staff Header */}
            <div
              className="grid border-b border-black/5 bg-zinc-50 text-xs font-bold divide-x divide-zinc-200"
              style={{
                gridTemplateColumns: `80px repeat(${Math.max(1, safeStaff.length)}, minmax(200px, 1fr))`,
              }}
            >
              <div className="p-3 text-zinc-400 font-mono text-center">Time</div>
              {safeStaff.map((s) => (
                <div key={s.id} className="p-3 text-center space-y-0.5">
                  <div className="font-extrabold text-[#1E1E1E] text-sm">{s.name}</div>
                  <div className="text-[10px] text-zinc-500 font-normal truncate">
                    {s.specialties.join(", ") || "General Stylist"}
                  </div>
                </div>
              ))}
            </div>

            {/* Time Rows per Staff */}
            <div className="divide-y divide-zinc-100">
              {HOURS.map((hour) => {
                const hourLabel = `${hour.toString().padStart(2, "0")}:00`;

                return (
                  <div
                    key={hour}
                    className="grid divide-x divide-zinc-100 min-h-[76px]"
                    style={{
                      gridTemplateColumns: `80px repeat(${Math.max(1, safeStaff.length)}, minmax(200px, 1fr))`,
                    }}
                  >
                    <div className="p-2 text-[11px] font-mono text-zinc-400 font-bold select-none text-center">
                      {hourLabel}
                    </div>

                    {safeStaff.map((s) => {
                      const slotKey = `staff-${s.id}-${hour}`;
                      const isDragOver = dragOverSlot === slotKey;
                      const staffBookings = bookings.filter((b) => {
                        const bDate = b.startUtc.split("T")[0];
                        const bHour = new Date(b.startUtc).getUTCHours();
                        return b.staff.id === s.id && bDate === selectedDate && bHour === hour;
                      });

                      return (
                        <div
                          key={s.id}
                          onDragOver={(e) => handleDragOver(e, slotKey)}
                          onDrop={(e) => handleDrop(e, selectedDate, hour, s.id)}
                          className={`p-1.5 flex flex-col gap-1 transition-colors ${
                            isDragOver ? "bg-zinc-200 border-2 border-dashed border-black" : "hover:bg-zinc-50/60"
                          }`}
                        >
                          {staffBookings.map((b) => (
                            <BookingCard
                              key={b.id}
                              booking={b}
                              canDrag={canEdit}
                              onDragStart={(e) => handleDragStart(e, b)}
                              onClick={() => onSelectBooking(b.id)}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Individual Draggable Appointment Card
function BookingCard({
  booking,
  compact = false,
  canDrag = true,
  onDragStart,
  onClick,
}: {
  booking: BookingRecord;
  compact?: boolean;
  canDrag?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  onClick: () => void;
}) {
  const startTime = new Date(booking.startUtc).toLocaleTimeString("en-GB", {
    timeZone: "Africa/Accra",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (compact) {
    return (
      <div
        draggable={canDrag}
        onDragStart={onDragStart}
        onClick={onClick}
        className="p-2 rounded-xl bg-white border border-black/10 hover:border-black shadow-xs cursor-pointer select-none transition-all space-y-1 text-left"
      >
        <div className="flex items-center justify-between gap-1">
          <span className="font-mono text-[9px] font-bold text-zinc-500">{startTime}</span>
          <BookingStatusBadge status={booking.status} size="sm" />
        </div>
        <div className="font-bold text-[11px] text-[#1E1E1E] truncate">{booking.customer.name}</div>
        <div className="text-[10px] text-zinc-500 truncate">
          {booking.items[0]?.name || "Service"}
        </div>
      </div>
    );
  }

  return (
    <div
      draggable={canDrag}
      onDragStart={onDragStart}
      onClick={onClick}
      className="p-3 rounded-2xl bg-white border border-black/10 hover:border-black/40 hover:shadow-md transition-all shadow-xs cursor-pointer select-none text-left space-y-2 min-w-[220px] max-w-[320px]"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-bold text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          <span>{startTime}</span>
        </span>
        <BookingStatusBadge status={booking.status} size="sm" />
      </div>

      <div>
        <div className="font-extrabold text-xs text-[#1E1E1E] flex items-center gap-1">
          <User className="w-3 h-3 text-zinc-400" />
          <span>{booking.customer.name}</span>
        </div>
        <div className="text-[11px] text-zinc-600 flex items-center gap-1 mt-0.5">
          <Scissors className="w-3 h-3 text-zinc-400" />
          <span className="truncate">
            {booking.items.map((i) => i.name).join(", ") || "No services"}
          </span>
        </div>
      </div>

      <div className="pt-1 border-t border-zinc-100 flex items-center justify-between text-[10px]">
        <span className="text-zinc-500 font-mono">{booking.reference}</span>
        <span className="font-black text-[#1E1E1E]">{formatPesewas(booking.totalPesewas)}</span>
      </div>
    </div>
  );
}
