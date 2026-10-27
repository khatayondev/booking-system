"use client";

import * as React from "react";
import {
  Calendar,
  Smartphone,
  CreditCard,
  Banknote,
  Printer,
  AlertTriangle,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { formatPesewas } from "@/lib/money";
import type { EndOfDaySummary } from "@/lib/pos/types";

export function EndOfDayModal({
  isOpen,
  onClose,
  userRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
}) {
  const [selectedDate, setSelectedDate] = React.useState<string>(
    new Date().toISOString().split("T")[0]
  );
  const [summary, setSummary] = React.useState<EndOfDaySummary | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setIsLoading(true);
      setError(null);
    }
  }

  React.useEffect(() => {
    let ignore = false;
    if (isOpen) {
      fetch(`/api/admin/pos/summary?date=${encodeURIComponent(selectedDate)}`)
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data.error?.message || "Failed to load summary");
          }
          if (!ignore) {
            setSummary(data.data.summary);
            setIsLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!ignore) {
            setError(err instanceof Error ? err.message : "Failed to load End-of-Day summary");
            setIsLoading(false);
          }
        });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, selectedDate]);

  const handlePrint = () => {
    window.print();
  };

  const isAuthorized = userRole === "OWNER_ADMIN" || userRole === "MANAGER";

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="End-of-Day Financial Summary & Cash Drawer"
      description="Manager reconciliation of Cash in drawer, Mobile Money payments, Card transactions, staff tips, and voided receipts."
    >
      <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
        {!isAuthorized ? (
          <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>Unauthorized: The End-of-Day summary is reserved for Manager and Owner roles.</span>
          </div>
        ) : (
          <>
            {/* Date filter & Print */}
            <div className="flex items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-9 text-xs rounded-xl w-40"
                />
              </div>

              <Button
                type="button"
                variant="outlinePill"
                onClick={handlePrint}
                className="h-9 text-xs font-semibold rounded-xl flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Report</span>
              </Button>
            </div>

            {isLoading && (
              <div className="p-8 text-center text-xs text-zinc-400">
                Loading financial reconciliation data...
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            {summary && !isLoading && (
              <div className="space-y-4 text-xs">
                {/* KPI Highlights */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-zinc-900 text-white rounded-2xl">
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">Total Revenue</span>
                    <p className="text-lg font-bold tracking-tight mt-0.5">
                      {formatPesewas(summary.totalRevenuePesewas)}
                    </p>
                    <span className="text-[10px] text-zinc-400">{summary.totalSalesCount} sales</span>
                  </div>

                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-300 rounded-2xl">
                    <span className="text-[10px] uppercase font-semibold text-emerald-700 dark:text-emerald-400">
                      Cash in Drawer
                    </span>
                    <p className="text-lg font-bold tracking-tight mt-0.5">
                      {formatPesewas(summary.methods.cash.netCashInDrawerPesewas)}
                    </p>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                      Change given: {formatPesewas(summary.methods.cash.totalChangeGivenPesewas)}
                    </span>
                  </div>

                  <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-300 rounded-2xl">
                    <span className="text-[10px] uppercase font-semibold text-amber-700 dark:text-amber-400">
                      Discounts Given
                    </span>
                    <p className="text-lg font-bold tracking-tight mt-0.5">
                      {formatPesewas(summary.totalDiscountsPesewas)}
                    </p>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400">
                      Subtotal: {formatPesewas(summary.grossSubtotalPesewas)}
                    </span>
                  </div>

                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-300 rounded-2xl">
                    <span className="text-[10px] uppercase font-semibold text-blue-700 dark:text-blue-400">
                      Staff Tips
                    </span>
                    <p className="text-lg font-bold tracking-tight mt-0.5">
                      {formatPesewas(summary.totalTipsPesewas)}
                    </p>
                    <span className="text-[10px] text-blue-600 dark:text-blue-400">
                      Pending balance: {formatPesewas(summary.totalBalanceDuePesewas)}
                    </span>
                  </div>
                </div>

                {/* Tender Method Breakdown */}
                <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white">
                    Payment Tender Breakdown
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Cash */}
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                        <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Cash Drawer</span>
                      </div>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>Gross Tendered:</span>
                        <span>{formatPesewas(summary.methods.cash.totalCollectedPesewas)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>Change Returned:</span>
                        <span>-{formatPesewas(summary.methods.cash.totalChangeGivenPesewas)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-white pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <span>Net Cash:</span>
                        <span>{formatPesewas(summary.methods.cash.netCashInDrawerPesewas)}</span>
                      </div>
                    </div>

                    {/* Mobile Money */}
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                        <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                        <span>Mobile Money</span>
                      </div>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>Transactions:</span>
                        <span>{summary.methods.mobileMoney.transactionCount}</span>
                      </div>
                      {Object.entries(summary.methods.mobileMoney.byProvider).map(([prov, amt]) => (
                        <div key={prov} className="flex justify-between text-[11px] text-zinc-500">
                          <span>{prov}:</span>
                          <span>{formatPesewas(amt)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-white pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <span>Total MoMo:</span>
                        <span>{formatPesewas(summary.methods.mobileMoney.totalCollectedPesewas)}</span>
                      </div>
                    </div>

                    {/* Card */}
                    <div className="p-3 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-white">
                        <CreditCard className="w-3.5 h-3.5 text-blue-500" />
                        <span>Card / POS</span>
                      </div>
                      <div className="flex justify-between text-zinc-600 dark:text-zinc-400 text-[11px]">
                        <span>Transactions:</span>
                        <span>{summary.methods.card.transactionCount}</span>
                      </div>
                      {Object.entries(summary.methods.card.byProvider).map(([prov, amt]) => (
                        <div key={prov} className="flex justify-between text-[11px] text-zinc-500">
                          <span>{prov}:</span>
                          <span>{formatPesewas(amt)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-zinc-900 dark:text-white pt-1 border-t border-zinc-100 dark:border-zinc-800">
                        <span>Total Card:</span>
                        <span>{formatPesewas(summary.methods.card.totalCollectedPesewas)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Staff Tips Table */}
                {summary.staffTips.length > 0 && (
                  <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      <span>Staff Tip Distribution</span>
                    </h3>
                    <div className="divide-y divide-zinc-200 dark:divide-zinc-700 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden">
                      {summary.staffTips.map((st) => (
                        <div key={st.staffId} className="flex justify-between items-center p-2.5">
                          <span className="font-semibold text-zinc-900 dark:text-white">{st.staffName}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatPesewas(st.tipPesewas)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Voids & Refunds Table */}
                {summary.voids.count > 0 && (
                  <div className="p-4 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-2xl space-y-2">
                    <div className="flex justify-between items-center">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-red-800 dark:text-red-300">
                        Voided Sales ({summary.voids.count})
                      </h3>
                      <span className="font-bold text-red-700 dark:text-red-400">
                        Total Voided: {formatPesewas(summary.voids.totalVoidedPesewas)}
                      </span>
                    </div>

                    <div className="divide-y divide-red-200 dark:divide-red-900/40 bg-white dark:bg-zinc-900 rounded-xl border border-red-100 dark:border-red-950 overflow-hidden">
                      {summary.voids.items.map((item, idx) => (
                        <div key={idx} className="p-2.5 flex justify-between items-start text-[11px]">
                          <div>
                            <span className="font-bold text-zinc-900 dark:text-white">
                              {item.receiptNumber}
                            </span>
                            <p className="text-zinc-500">Reason: {item.voidReason}</p>
                            <span className="text-[10px] text-zinc-400">By {item.voidedByName}</span>
                          </div>
                          <span className="font-bold text-red-600">
                            -{formatPesewas(item.totalPesewas)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Dialog>
  );
}
