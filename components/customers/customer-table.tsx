"use client";

import * as React from "react";
import {
  User,
  Phone,
  Mail,
  Calendar,
  AlertTriangle,
  Crown,
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
      <div className="w-full bg-white rounded-2xl border border-black/5 overflow-hidden shadow-xs animate-pulse">
        <div className="p-4 border-b border-[#F4F4F6] bg-[#FAFAFB] flex items-center justify-between">
          <div className="h-4 w-32 bg-[#F4F4F6] rounded-md"></div>
          <div className="h-4 w-24 bg-[#F4F4F6] rounded-md"></div>
        </div>
        <div className="divide-y divide-[#F4F4F6]">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#F4F4F6]" />
                <div className="space-y-1.5">
                  <div className="h-3.5 w-36 bg-[#F4F4F6] rounded" />
                  <div className="h-3 w-28 bg-[#F4F4F6] rounded" />
                </div>
              </div>
              <div className="h-5 w-24 bg-[#F4F4F6] rounded-full" />
              <div className="h-4 w-20 bg-[#F4F4F6] rounded" />
              <div className="h-8 w-20 bg-[#F4F4F6] rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (customers.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl border border-black/5 p-12 text-center shadow-xs space-y-3">
        <div className="w-14 h-14 rounded-full bg-[#F4F4F6] flex items-center justify-center mx-auto text-[#71717A]">
          <User className="w-7 h-7 stroke-[1.5]" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-[#1E1E1E]">No customers found</h3>
          <p className="text-xs text-[#71717A] max-w-sm mx-auto mt-1">
            No customer profiles match your current search query or active filter criteria.
          </p>
        </div>
        {onResetFilters && (
          <div className="pt-2">
            <Button variant="blackPill" size="sm" onClick={onResetFilters}>
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-2xl border border-black/5 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#FAFAFB] text-[10px] font-bold text-[#71717A] uppercase tracking-wider border-b border-[#F4F4F6]">
            <tr>
              <th scope="col" className="px-5 py-3.5">Customer</th>
              <th scope="col" className="px-5 py-3.5">Contact</th>
              <th scope="col" className="px-5 py-3.5">Alerts &amp; Tags</th>
              <th scope="col" className="px-5 py-3.5">Visits &amp; Spend</th>
              <th scope="col" className="px-5 py-3.5">Last Visit</th>
              <th scope="col" className="px-5 py-3.5">Marketing</th>
              <th scope="col" className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F4F4F6]">
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
                  className="hover:bg-[#FAFAFB] transition-colors cursor-pointer group"
                  data-testid={`customer-row-${c.id}`}
                >
                  {/* Customer Identity */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs font-poppins shrink-0 ${
                          c.isAnonymized
                            ? "bg-zinc-100 text-zinc-500"
                            : isVip
                            ? "bg-amber-100 text-amber-900 border border-amber-300/80"
                            : isBridal
                            ? "bg-rose-100 text-rose-900 border border-rose-300/80"
                            : "bg-[#F4F4F6] text-[#1E1E1E] border border-[#E4E4E7]"
                        }`}
                      >
                        {c.isAnonymized ? (
                          <ShieldAlert className="w-4 h-4 text-zinc-500" />
                        ) : (
                          initials || "C"
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold text-xs ${
                              c.isAnonymized
                                ? "text-zinc-500 italic"
                                : "text-[#1E1E1E] group-hover:text-black transition-colors"
                            }`}
                          >
                            {c.name}
                          </span>
                          {c.isAnonymized && (
                            <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-zinc-100 text-zinc-600 border border-zinc-200">
                              Anonymized (DPA)
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[#A1A1AA] mt-0.5">
                          Joined {new Date(c.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Contact Info */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-[#1E1E1E]">
                        <Phone className="w-3 h-3 text-[#71717A] shrink-0" />
                        <span className="font-poppins">{c.phone}</span>
                      </div>
                      {c.email ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
                          <Mail className="w-3 h-3 text-[#A1A1AA] shrink-0" />
                          <span className="truncate max-w-[170px]">{c.email}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#A1A1AA] italic pl-4.5 block">No email</span>
                      )}
                    </div>
                  </td>

                  {/* Alerts & Tags */}
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap items-center gap-1.5 max-w-[220px]">
                      {/* Highlighted Allergy Notice */}
                      {c.allergies && (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-300 shadow-2xs"
                          title={`Allergy / Sensitivity: ${c.allergies}`}
                          data-testid="customer-allergy-chip"
                        >
                          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                          <span className="truncate max-w-[110px]">Allergy: {c.allergies}</span>
                        </span>
                      )}

                      {/* Tags */}
                      {c.tags.map((tag) => {
                        const isTagVip = tag.toLowerCase() === "vip";
                        const isTagBridal = tag.toLowerCase() === "bridal";
                        return (
                          <span
                            key={tag}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              isTagVip
                                ? "bg-amber-50 text-amber-900 border-amber-200"
                                : isTagBridal
                                ? "bg-rose-50 text-rose-900 border-rose-200"
                                : "bg-[#F4F4F6] text-[#1E1E1E] border-[#E4E4E7]"
                            }`}
                          >
                            {isTagVip && <Crown className="w-2.5 h-2.5 text-amber-600" />}
                            {isTagBridal && <HeartHandshake className="w-2.5 h-2.5 text-rose-600" />}
                            {tag}
                          </span>
                        );
                      })}

                      {!c.allergies && c.tags.length === 0 && (
                        <span className="text-[11px] text-[#A1A1AA]">—</span>
                      )}
                    </div>
                  </td>

                  {/* Visits & Spend */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div>
                      <div className="font-poppins font-black text-xs text-[#1E1E1E]">
                        {formatPesewas(c.lifetimeSpendPesewas)}
                      </div>
                      <div className="text-[10px] text-[#71717A] font-poppins">
                        {c.visitCount} {c.visitCount === 1 ? "completed visit" : "completed visits"}
                      </div>
                    </div>
                  </td>

                  {/* Last Visit / Upcoming */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="space-y-1">
                      <div className="text-xs font-poppins text-[#1E1E1E]">
                        {c.lastVisit ? (
                          new Date(c.lastVisit).toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        ) : (
                          <span className="text-[#A1A1AA] italic text-[11px]">No past visits</span>
                        )}
                      </div>
                      {c.upcomingBooking && (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <Calendar className="w-2.5 h-2.5 text-emerald-600" />
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
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    {c.marketingConsent ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Opted In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[#A1A1AA]">
                        <XCircle className="w-3.5 h-3.5 text-[#A1A1AA]" />
                        No Consent
                      </span>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-5 py-3.5 whitespace-nowrap text-right">
                    <Button
                      variant="outlinePill"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectCustomer(c);
                      }}
                      className="text-xs h-7.5 px-3 gap-1 hover:bg-[#F4F4F6] border-[#E4E4E7] text-[#1E1E1E]"
                    >
                      <span>Manage</span>
                      <ChevronRight className="w-3 h-3 text-[#71717A]" />
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
