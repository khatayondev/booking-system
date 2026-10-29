"use client";

import * as React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  Phone,
  Calendar,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPesewas } from "@/lib/money";
import { BookingRecord } from "./types";
import { BookingStatusBadge } from "./status-badge";

interface ListViewProps {
  bookings: BookingRecord[];
  total: number;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onSelectBooking: (id: string) => void;
}

export function BookingListView({
  bookings,
  total,
  page,
  totalPages,
  onPageChange,
  onSelectBooking,
}: ListViewProps) {
  if (bookings.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-black/10 p-12 text-center space-y-3 shadow-xs">
        <Calendar className="w-10 h-10 text-zinc-300 mx-auto" />
        <h4 className="text-base font-bold text-[#1E1E1E]">No Bookings Found</h4>
        <p className="text-xs text-zinc-500 max-w-sm mx-auto">
          No appointments matched your active filter criteria or search query.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-black/10 overflow-hidden shadow-xs space-y-4 p-5">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-black/10 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">Reference</th>
              <th className="py-3 px-3">Client</th>
              <th className="py-3 px-3">Services</th>
              {/* Solo direct shop mode: Stylist column omitted
              <th className="py-3 px-3">Stylist</th>
              */}
              <th className="py-3 px-3">Date & Time</th>
              <th className="py-3 px-3">Payment</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 font-medium">
            {bookings.map((b) => {
              const start = new Date(b.startUtc);
              const dateStr = start.toLocaleDateString("en-GB", {
                timeZone: "Africa/Accra",
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const timeStr = start.toLocaleTimeString("en-GB", {
                timeZone: "Africa/Accra",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              });

              return (
                <tr
                  key={b.id}
                  onClick={() => onSelectBooking(b.id)}
                  className="hover:bg-zinc-50/80 transition-colors cursor-pointer group"
                >
                  {/* Reference */}
                  <td className="py-3.5 px-3">
                    <span className="font-mono font-bold text-[#1E1E1E] block">
                      {b.reference}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase font-mono">
                      {b.source}
                    </span>
                  </td>

                  {/* Customer */}
                  <td className="py-3.5 px-3">
                    <div className="font-bold text-[#1E1E1E]">{b.customer.name}</div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />
                      <span>{b.customer.phone}</span>
                    </div>
                  </td>

                  {/* Services */}
                  <td className="py-3.5 px-3 max-w-[200px]">
                    <div className="text-zinc-800 font-semibold truncate">
                      {b.items.map((i) => i.name).join(", ")}
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      {b.items.reduce((s, i) => s + i.durationMin, 0)} mins total
                    </div>
                  </td>

                  {/* Solo direct shop mode: Stylist column omitted
                  <td className="py-3.5 px-3">
                    <span className="font-bold text-zinc-800">{b.staff.name}</span>
                  </td>
                  */}

                  {/* Date & Time */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="font-extrabold text-[#1E1E1E]">{dateStr}</div>
                    <div className="text-[11px] text-zinc-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{timeStr}</span>
                    </div>
                  </td>

                  {/* Financials */}
                  <td className="py-3.5 px-3 whitespace-nowrap">
                    <div className="font-black text-[#1E1E1E]">
                      {formatPesewas(b.totalPesewas)}
                    </div>
                    {b.balanceDuePesewas > 0 ? (
                      <span className="text-[10px] text-amber-800 font-semibold block">
                        Due: {formatPesewas(b.balanceDuePesewas)}
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-700 font-bold block">
                        Paid Full
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3.5 px-3">
                    <BookingStatusBadge status={b.status} size="sm" />
                  </td>

                  {/* Action */}
                  <td className="py-3.5 px-3 text-right">
                    <Button
                      size="sm"
                      variant="outlinePill"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBooking(b.id);
                      }}
                      className="text-xs h-7 px-2.5 gap-1 cursor-pointer bg-white group-hover:border-black"
                    >
                      <Eye className="w-3 h-3" />
                      <span>View</span>
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="pt-3 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <div>
          Showing <strong className="text-black">{bookings.length}</strong> of{" "}
          <strong className="text-black">{total}</strong> total bookings
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outlinePill"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="text-xs h-8 px-3 gap-1 cursor-pointer bg-white"
          >
            <ChevronLeft className="w-3 h-3" />
            <span>Previous</span>
          </Button>

          <span className="text-xs font-mono font-bold text-zinc-700 px-2">
            Page {page} of {Math.max(1, totalPages)}
          </span>

          <Button
            size="sm"
            variant="outlinePill"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="text-xs h-8 px-3 gap-1 cursor-pointer bg-white"
          >
            <span>Next</span>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
