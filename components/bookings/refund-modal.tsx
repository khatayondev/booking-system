"use client";

import * as React from "react";
import { AlertCircle, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPesewas } from "@/lib/money";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  reference: string;
  customerName: string;
  amountPaidPesewas: number;
  onSuccess: () => void;
}

function RefundModalContent({
  onClose,
  bookingId,
  reference,
  customerName,
  amountPaidPesewas,
  onSuccess,
}: Omit<RefundModalProps, "isOpen">) {
  const [amountGhs, setAmountGhs] = React.useState<string>(() =>
    (amountPaidPesewas / 100).toFixed(2)
  );
  const [refundType, setRefundType] = React.useState<"PAYSTACK" | "MANUAL">("MANUAL");
  const [reason, setReason] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedGhs = parseFloat(amountGhs);
    if (isNaN(parsedGhs) || parsedGhs <= 0) {
      setError("Please enter a valid refund amount in GH₵.");
      return;
    }

    const pesewas = Math.round(parsedGhs * 100);
    if (pesewas > amountPaidPesewas) {
      setError(`Refund cannot exceed the remaining paid amount (${formatPesewas(amountPaidPesewas)}).`);
      return;
    }

    if (!reason.trim()) {
      setError("A refund reason is required by studio audit policy.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/admin/bookings/${bookingId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPesewas: pesewas,
          refundType,
          reason: reason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to process refund.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Refund failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 text-[10px] font-bold uppercase tracking-wider">
              <RotateCcw className="w-3 h-3" /> Issue Booking Refund
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Refund for {reference}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Customer: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{customerName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
            <div>{error}</div>
          </div>
        )}

        <div className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs flex justify-between items-center">
          <span className="text-zinc-500">Total Paid Amount:</span>
          <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
            {formatPesewas(amountPaidPesewas)}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Refund Amount (GH₵)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-xs font-semibold text-zinc-400">GH₵</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={(amountPaidPesewas / 100).toFixed(2)}
                value={amountGhs}
                onChange={(e) => setAmountGhs(e.target.value)}
                className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-12 pr-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div className="flex gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setAmountGhs((amountPaidPesewas / 100).toFixed(2))}
                className="text-[11px] text-zinc-500 hover:text-amber-600 underline font-medium"
              >
                Full Refund
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">•</span>
              <button
                type="button"
                onClick={() => setAmountGhs((amountPaidPesewas / 200).toFixed(2))}
                className="text-[11px] text-zinc-500 hover:text-amber-600 underline font-medium"
              >
                50% Partial Refund
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Refund Channel
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRefundType("MANUAL")}
                className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                  refundType === "MANUAL"
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <div className="font-semibold">Manual Record</div>
                <div className="text-[10px] text-zinc-400">Cash / Direct MoMo</div>
              </button>

              <button
                type="button"
                onClick={() => setRefundType("PAYSTACK")}
                className={`p-2.5 rounded-xl border text-left text-xs transition cursor-pointer ${
                  refundType === "PAYSTACK"
                    ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-300 font-semibold"
                    : "border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300"
                }`}
              >
                <div className="font-semibold">Paystack Gateway</div>
                <div className="text-[10px] text-zinc-400">Electronic Reversal</div>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Reason for Refund <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              placeholder="e.g. Client requested cancellation within free window, or service dissatisfaction..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex gap-2.5 pt-2">
            <Button
              type="button"
              variant="outlinePill"
              onClick={onClose}
              className="w-1/2 text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-1/2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-full"
            >
              {loading ? "Processing..." : "Issue Refund"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function RefundModal(props: RefundModalProps) {
  if (!props.isOpen) return null;
  return <RefundModalContent {...props} />;
}
