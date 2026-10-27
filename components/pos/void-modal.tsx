"use client";

import * as React from "react";
import { AlertTriangle, Search, AlertCircle, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/dialog-and-drawer";
import { formatPesewas } from "@/lib/money";
import type { PosReceiptDetail } from "@/lib/pos/types";

export function VoidModal({
  isOpen,
  onClose,
  userRole,
  onReceiptVoided,
}: {
  isOpen: boolean;
  onClose: () => void;
  userRole: string;
  onReceiptVoided: (receipt: PosReceiptDetail) => void;
}) {
  const [receiptNumberInput, setReceiptNumberInput] = React.useState("");
  const [receipt, setReceipt] = React.useState<PosReceiptDetail | null>(null);
  const [reason, setReason] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [isVoiding, setIsVoiding] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const maxRefundPesewas =
    userRole === "OWNER_ADMIN"
      ? Number.POSITIVE_INFINITY
      : userRole === "MANAGER"
      ? 50000 // GH₵ 500.00
      : 5000; // GH₵ 50.00

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNumberInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setReceipt(null);

    try {
      const res = await fetch(`/api/admin/pos/receipts/${encodeURIComponent(receiptNumberInput.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Receipt not found");
      }
      setReceipt(data.data.receipt);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to find receipt");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmVoid = async () => {
    if (!receipt) return;
    setError(null);

    if (!reason.trim()) {
      setError("A reason is strictly required to void a receipt.");
      return;
    }

    if (receipt.amountPaidPesewas > maxRefundPesewas) {
      setError(
        `Refund of ${formatPesewas(receipt.amountPaidPesewas)} exceeds your role's allowed maximum of ${formatPesewas(
          maxRefundPesewas
        )}. Higher manager/owner authorization required.`
      );
      return;
    }

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/admin/pos/receipts/${encodeURIComponent(receipt.id)}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to void receipt");
      }

      onReceiptVoided(data.data.receipt);
      onClose();
      setReceipt(null);
      setReceiptNumberInput("");
      setReason("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to void receipt");
    } finally {
      setIsVoiding(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Void POS Sale & Refund"
      description="Cancels the receipt, refunds associated POS payments, cancels linked appointments, and records an audit log entry."
    >
      <div className="space-y-4 pt-2">
        {/* Lookup form */}
        <form onSubmit={handleLookup} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <Input
              value={receiptNumberInput}
              onChange={(e) => setReceiptNumberInput(e.target.value)}
              placeholder="Enter receipt number (e.g. R-000123)..."
              className="pl-9 h-10 text-xs rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs h-10 px-4 rounded-xl font-medium"
          >
            {isLoading ? "Searching..." : "Lookup"}
          </Button>
        </form>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs rounded-xl flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Found Receipt Details */}
        {receipt && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-3 text-xs">
            <div className="flex justify-between items-start pb-2 border-b border-zinc-200 dark:border-zinc-700">
              <div>
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  Receipt {receipt.receiptNumber}
                </span>
                <p className="text-zinc-500 text-[11px]">Customer: {receipt.customerName} ({receipt.customerPhone})</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-sm text-zinc-900 dark:text-white">
                  {formatPesewas(receipt.totalPesewas)}
                </span>
                <p className="text-zinc-500 text-[11px]">
                  Paid: {formatPesewas(receipt.amountPaidPesewas)}
                </p>
              </div>
            </div>

            {receipt.status === "VOIDED" ? (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 rounded-xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>This receipt has ALREADY been voided.</span>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-xl flex justify-between items-center text-[11px]">
                  <span className="text-zinc-500">Your Refund Authorization Limit:</span>
                  <span className="font-bold text-zinc-900 dark:text-white">
                    {maxRefundPesewas === Number.POSITIVE_INFINITY
                      ? "Unlimited (Owner)"
                      : formatPesewas(maxRefundPesewas)}
                  </span>
                </div>

                <div>
                  <Label htmlFor="void-reason" className="text-xs font-semibold mb-1 block">
                    Void Reason * (Mandatory for security & audit)
                  </Label>
                  <Input
                    id="void-reason"
                    required
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g. Accidental double entry, customer requested cancellation, incorrect items billed..."
                    className="h-10 text-xs rounded-xl"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outlinePill"
                    onClick={() => setReceipt(null)}
                    className="text-xs rounded-xl h-9 px-3"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={isVoiding || !reason.trim()}
                    onClick={handleConfirmVoid}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs rounded-xl h-9 px-4 font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>{isVoiding ? "Processing Void..." : "Confirm Void & Refund"}</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Dialog>
  );
}
