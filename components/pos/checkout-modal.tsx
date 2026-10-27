"use client";

import * as React from "react";
import {
  CreditCard,
  Banknote,
  Smartphone,
  Trash2,
  AlertCircle,
  CheckCircle,
  Receipt as ReceiptIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { formatPesewas } from "@/lib/money";
import type { PosPaymentSplitInput, PosCheckoutInput, PosReceiptDetail } from "@/lib/pos/types";

export function CheckoutModal({
  isOpen,
  onClose,
  checkoutPayload,
  totalPesewas,
  onSuccess,
}: {
  isOpen: boolean;
  onClose: () => void;
  checkoutPayload: Omit<PosCheckoutInput, "payments">;
  totalPesewas: number;
  onSuccess: (receipt: PosReceiptDetail) => void;
}) {
  const [payments, setPayments] = React.useState<PosPaymentSplitInput[]>([
    {
      method: "CASH",
      amountPesewas: totalPesewas,
      tenderedPesewas: totalPesewas,
    },
  ]);
  const [tipGhs, setTipGhs] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync state when modal opens
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPayments([
        {
          method: "CASH",
          amountPesewas: totalPesewas,
          tenderedPesewas: totalPesewas,
        },
      ]);
      setTipGhs("");
      setError(null);
    }
  }

  const tipPesewas = Math.max(0, Math.round((parseFloat(tipGhs) || 0) * 100));
  const finalTotalPesewas = totalPesewas + tipPesewas;

  // Calculate payment math
  const totalPaidPesewas = payments.reduce((sum, p) => sum + (p.amountPesewas || 0), 0);
  const remainingBalancePesewas = Math.max(0, finalTotalPesewas - totalPaidPesewas);

  // Calculate cash change
  let totalChangePesewas = 0;
  for (const p of payments) {
    if (p.method === "CASH" && p.tenderedPesewas && p.tenderedPesewas > p.amountPesewas) {
      totalChangePesewas += p.tenderedPesewas - p.amountPesewas;
    }
  }

  const handleAddSplitMethod = (method: "CASH" | "MOBILE_MONEY" | "CARD") => {
    const unallocated = Math.max(0, finalTotalPesewas - totalPaidPesewas);
    setPayments((prev) => [
      ...prev,
      {
        method,
        amountPesewas: unallocated,
        tenderedPesewas: method === "CASH" ? unallocated : undefined,
        provider: method === "MOBILE_MONEY" ? "MTN" : method === "CARD" ? "VISA" : undefined,
        reference: "",
      },
    ]);
  };

  const handleRemoveSplit = (idx: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUpdatePayment = (idx: number, updates: Partial<PosPaymentSplitInput>) => {
    setPayments((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], ...updates };
      return copy;
    });
  };

  const handleCompleteSale = async () => {
    setError(null);

    if (payments.length === 0) {
      setError("At least one payment method is required.");
      return;
    }

    // Validation checks
    for (const p of payments) {
      if (p.amountPesewas < 0) {
        setError("Payment amounts cannot be negative.");
        return;
      }
      if (p.method === "CASH" && (p.tenderedPesewas ?? 0) < p.amountPesewas) {
        setError("Cash tendered cannot be less than the cash portion of the bill.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: PosCheckoutInput = {
        ...checkoutPayload,
        tipPesewas,
        payments,
      };

      const res = await fetch("/api/admin/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to process POS checkout");
      }

      onSuccess(data.data.receipt);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred during checkout.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="POS Checkout & Tender"
      description="Select payment tender, support split payments, record MoMo/Card references, or accept partial payment."
    >
      <div className="space-y-4 pt-1 max-h-[80vh] overflow-y-auto pr-1">
        {/* Total Banner */}
        <div className="p-4 bg-zinc-950 text-white rounded-2xl flex items-center justify-between">
          <div>
            <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
              Total Amount Due
            </span>
            <div className="text-2xl font-bold tracking-tight">
              {formatPesewas(finalTotalPesewas)}
            </div>
            {tipPesewas > 0 && (
              <span className="text-[11px] text-zinc-400">
                Includes {formatPesewas(tipPesewas)} staff tip
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-zinc-400 text-xs uppercase tracking-wider font-semibold">
              Total Tendered
            </span>
            <div className="text-xl font-bold text-emerald-400">
              {formatPesewas(totalPaidPesewas)}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Optional Tip Input */}
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="tip-input" className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
              Optional Staff Tip (GH₵)
            </Label>
            <p className="text-[10px] text-zinc-500">Attributed directly to scheduled staff member</p>
          </div>
          <Input
            id="tip-input"
            type="number"
            step="0.5"
            min="0"
            value={tipGhs}
            onChange={(e) => setTipGhs(e.target.value)}
            placeholder="0.00"
            className="w-28 h-9 text-xs rounded-xl text-right font-semibold"
          />
        </div>

        {/* Payment Splits Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider">
              Payment Methods ({payments.length})
            </Label>
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="outlinePill"
                size="sm"
                onClick={() => handleAddSplitMethod("CASH")}
                className="h-7 px-2 text-[11px] rounded-lg border-zinc-200 dark:border-zinc-800"
              >
                + Cash
              </Button>
              <Button
                type="button"
                variant="outlinePill"
                size="sm"
                onClick={() => handleAddSplitMethod("MOBILE_MONEY")}
                className="h-7 px-2 text-[11px] rounded-lg border-zinc-200 dark:border-zinc-800"
              >
                + MoMo
              </Button>
              <Button
                type="button"
                variant="outlinePill"
                size="sm"
                onClick={() => handleAddSplitMethod("CARD")}
                className="h-7 px-2 text-[11px] rounded-lg border-zinc-200 dark:border-zinc-800"
              >
                + Card
              </Button>
            </div>
          </div>

          {payments.map((p, idx) => (
            <div
              key={idx}
              className="p-3.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {p.method === "CASH" && (
                    <div className="p-1.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
                      <Banknote className="w-4 h-4" />
                    </div>
                  )}
                  {p.method === "MOBILE_MONEY" && (
                    <div className="p-1.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded-lg">
                      <Smartphone className="w-4 h-4" />
                    </div>
                  )}
                  {p.method === "CARD" && (
                    <div className="p-1.5 bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 rounded-lg">
                      <CreditCard className="w-4 h-4" />
                    </div>
                  )}
                  <span className="font-bold text-xs text-zinc-900 dark:text-white">
                    {p.method === "CASH"
                      ? "Cash Tender"
                      : p.method === "MOBILE_MONEY"
                      ? "Mobile Money (MoMo)"
                      : "Card / POS Slip"}
                  </span>
                </div>

                {payments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveSplit(idx)}
                    className="h-7 w-7 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>

              {/* Amount Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                    Amount Applied (GH₵)
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={(p.amountPesewas / 100).toFixed(2)}
                    onChange={(e) => {
                      const pesewas = Math.round((parseFloat(e.target.value) || 0) * 100);
                      handleUpdatePayment(idx, {
                        amountPesewas: pesewas,
                        tenderedPesewas:
                          p.method === "CASH"
                            ? Math.max(pesewas, p.tenderedPesewas || pesewas)
                            : undefined,
                      });
                    }}
                    className="h-9 text-xs rounded-xl"
                  />
                </div>

                {p.method === "CASH" ? (
                  <div>
                    <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Cash Handed Over (GH₵)
                    </Label>
                    <Input
                      type="number"
                      step="0.01"
                      min={(p.amountPesewas / 100).toFixed(2)}
                      value={((p.tenderedPesewas ?? p.amountPesewas) / 100).toFixed(2)}
                      onChange={(e) => {
                        const tendered = Math.round((parseFloat(e.target.value) || 0) * 100);
                        handleUpdatePayment(idx, { tenderedPesewas: tendered });
                      }}
                      className="h-9 text-xs rounded-xl"
                    />
                  </div>
                ) : p.method === "MOBILE_MONEY" ? (
                  <div>
                    <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Provider & Reference
                    </Label>
                    <div className="flex gap-2">
                      <select
                        value={p.provider || "MTN"}
                        onChange={(e) => handleUpdatePayment(idx, { provider: e.target.value })}
                        className="h-9 text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 bg-transparent text-zinc-900 dark:text-white"
                      >
                        <option value="MTN">MTN MoMo</option>
                        <option value="TELECEL">Telecel Cash</option>
                        <option value="AT">AT Money</option>
                      </select>
                      <Input
                        placeholder="Tx Ref #..."
                        value={p.reference || ""}
                        onChange={(e) => handleUpdatePayment(idx, { reference: e.target.value })}
                        className="h-9 text-xs rounded-xl flex-1"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Label className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 block mb-1">
                      Card Slip / Auth Code
                    </Label>
                    <div className="flex gap-2">
                      <select
                        value={p.provider || "VISA"}
                        onChange={(e) => handleUpdatePayment(idx, { provider: e.target.value })}
                        className="h-9 text-xs border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 bg-transparent text-zinc-900 dark:text-white"
                      >
                        <option value="VISA">Visa</option>
                        <option value="MASTERCARD">Mastercard</option>
                        <option value="GH_LINK">Gh-Link</option>
                      </select>
                      <Input
                        placeholder="Auth Slip #..."
                        value={p.reference || ""}
                        onChange={(e) => handleUpdatePayment(idx, { reference: e.target.value })}
                        className="h-9 text-xs rounded-xl flex-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Live Calculation Summary Banner */}
        <div className="p-3.5 bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-1.5 text-xs">
          {totalChangePesewas > 0 && (
            <div className="flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 p-2 rounded-xl">
              <span>Change Due to Customer:</span>
              <span className="text-sm">{formatPesewas(totalChangePesewas)}</span>
            </div>
          )}

          {remainingBalancePesewas > 0 ? (
            <div className="flex justify-between items-center text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 p-2 rounded-xl">
              <span>Remaining Balance (Unpaid):</span>
              <span className="text-sm">{formatPesewas(remainingBalancePesewas)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold pt-1">
              <CheckCircle className="w-4 h-4" />
              <span>Full tender provided. Sale will be marked as PAID in full.</span>
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button
            type="button"
            variant="outlinePill"
            onClick={onClose}
            className="rounded-xl text-xs h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleCompleteSale}
            className="bg-zinc-900 hover:bg-black text-white dark:bg-white dark:text-zinc-900 rounded-xl text-xs h-10 px-5 font-bold flex items-center gap-2 shadow-sm"
          >
            <ReceiptIcon className="w-4 h-4" />
            <span>{isSubmitting ? "Generating Receipt..." : "Complete & Print Receipt"}</span>
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
