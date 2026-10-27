"use client";

import * as React from "react";
import {
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Sparkles,
  HeartHandshake,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPesewas } from "@/lib/money";
import type { CustomerSummary } from "@/lib/customers/types";

interface CustomerTableProps {
  customers: CustomerSummary[];
  loading?: boolean;
  onSelectCustomer: (customer: CustomerSummary) => void;
  onResetFilters?: () => void;
}

export function CustomerTable({
  customers,
  loading = false,
  onSelectCustomer,
  onResetFilters,
}: CustomerTableProps) {
  if (loading) {
    return (
      <div className="w-full bg-zinc-900/60 rounded-xl border border-zinc-800/80 overflow-hidden shadow-xl animate-pulse">
        <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex items-center justify-between">
          <div className="h-4 w-32 bg-zinc-800 rounded"></div>
          <div className="h-4 w-24 bg-zinc-800 rounded"></div>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-zinc-800" />
                <div className="space-y-1.5">
                  <div className="h-4 w-36 bg-zinc-800 rounded" />
                  <div className="h-3 w-28 bg-zinc-800/70 rounded" />
                </div>
              </div>
              <div className="h-6 w-24 bg-zinc-800 rounded-full" />
              <div className="h-4 w-20 bg-zinc-800 rounded" />
              <div className="h-8 w-24 bg-zinc-800 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="w-full bg-zinc-900/40 rounded-xl border border-zinc-800/60 p-12 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto mb-4 text-zinc-500">
          <User className="w-8 h-8 stroke-[1.5]" />
        </div>
        <h3 className="text-lg font-semibold text-zinc-200 mb-1">No customers found</h3>
        <p className="text-sm text-zinc-400 max-w-sm mx-auto mb-6">
          We couldn&apos;t find any customer records matching your current search or filter criteria.
        </p>
        {onResetFilters && (
          <Button variant="outlinePill" size="sm" onClick={onResetFilters}>
            Clear all filters
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900/70 rounded-xl border border-zinc-800/80 overflow-hidden shadow-xl backdrop-blur-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-950/70 text-xs font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
            <tr>
              <th scope="col" className="px-5 py-4">Customer</th>
              <th scope="col" className="px-5 py-4">Contact</th>
              <th scope="col" className="px-5 py-4">Tags & Alerts</th>
              <th scope="col" className="px-5 py-4">Visits & Spend</th>
              <th scope="col" className="px-5 py-4">Last Visit</th>
              <th scope="col" className="px-5 py-4">Marketing</th>
              <th scope="col" className="px-5 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {customers.map((c) => {
              const initials = c.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0].toUpperCase())
                .join("");

              const isVip = c.tags.some((t) => t.toLowerCase() === "vip");
              const isBridal = c.tags.some((t) => t.toLowerCase() === "bridal");

              return (
                <tr
                  key={c.id}
                  onClick={() => onSelectCustomer(c)}
                  className="hover:bg-zinc-800/40 transition-colors cursor-pointer group"
                  data-testid={`customer-row-${c.id}`}
                >
                  {/* Customer Identity */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs ring-1 ring-white/10 ${
                        c.isAnonymized
                          ? "bg-zinc-800 text-zinc-500"
                          : isVip
                          ? "bg-amber-500/20 text-amber-300 ring-amber-500/30"
                          : isBridal
                          ? "bg-rose-500/20 text-rose-300 ring-rose-500/30"
                          : "bg-purple-900/40 text-purple-300 ring-purple-500/20"
                      }`}>
                        {c.isAnonymized ? <ShieldAlert className="w-5 h-5 text-zinc-500" /> : initials || "C"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${c.isAnonymized ? "text-zinc-500 italic" : "text-zinc-100 group-hover:text-amber-400 transition-colors"}`}>
                            {c.name}
                          </span>
                          {c.isAnonymized && (
                            <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Anonymized (DPA)
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400">
                          Joined {new Date(c.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-300 text-xs">
                        <Phone className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="font-mono">{c.phone}</span>
                      </div>
                      {c.email ? (
                        <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                          <Mail className="w-3.5 h-3.5 text-zinc-500 flex-shrink-0" />
                          <span className="truncate max-w-[170px]">{c.email}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-600 italic">No email</span>
                      )}
                    </div>
                  </td>

                  {/* Tags & Allergy Alerts */}
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                      {/* Highlighted Allergy Notice */}
                      {c.allergies && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm"
                          title={`Allergy / Sensitivity: ${c.allergies}`}
                          data-testid="customer-allergy-chip"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-400" />
                          <span className="truncate max-w-[120px]">Allergy: {c.allergies}</span>
                        </span>
                      )}

                      {/* Tags */}
                      {c.tags.map((tag) => {
                        const isTagVip = tag.toLowerCase() === "vip";
                        const isTagBridal = tag.toLowerCase() === "bridal";
                        return (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
                              isTagVip
                                ? "bg-amber-400/10 text-amber-300 border-amber-400/30"
                                : isTagBridal
                                ? "bg-rose-400/10 text-rose-300 border-rose-400/30"
                                : "bg-zinc-800 text-zinc-300 border-zinc-700"
                            }`}
                          >
                            {isTagVip && <Sparkles className="w-2.5 h-2.5 text-amber-400" />}
                            {isTagBridal && <HeartHandshake className="w-2.5 h-2.5 text-rose-400" />}
                            {tag}
                          </span>
                        );
                      })}

                      {!c.allergies && c.tags.length === 0 && (
                        <span className="text-[11px] text-zinc-600">—</span>
                      )}
                    </div>
                  </td>

                  {/* Visits & Spend */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div>
                      <div className="font-semibold text-zinc-200">
                        {formatPesewas(c.lifetimeSpendPesewas)}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {c.visitCount} {c.visitCount === 1 ? "completed visit" : "completed visits"}
                      </div>
                    </div>
                  </td>

                  {/* Last Visit / Upcoming */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-xs text-zinc-300">
                        {c.lastVisit ? (
                          new Date(c.lastVisit).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        ) : (
                          <span className="text-zinc-500 italic">No past visits</span>
                        )}
                      </div>
                      {c.upcomingBooking && (
                        <div className="inline-flex items-center gap-1 text-[11px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                          <Calendar className="w-3 h-3 text-emerald-400" />
                          <span>
                            Upcoming:{" "}
                            {new Date(c.upcomingBooking.startUtc).toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Marketing Consent */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {c.marketingConsent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Opted In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                        <XCircle className="w-3.5 h-3.5 text-zinc-600" />
                        No Consent
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-4 whitespace-nowrap text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(c);
                      }}
                      className="text-zinc-400 group-hover:text-amber-400 group-hover:bg-amber-400/10 transition-colors"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
