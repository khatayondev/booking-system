"use client";

import * as React from "react";
import {
  Send,
  X,
  Smartphone,
  AlertCircle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/controls";
import { formatPesewas } from "@/lib/money";
import type { PaymentRequestDetail } from "@/lib/payment-requests/types";

interface RequestPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  balanceDuePesewas: number;
  onSuccess: (paymentRequest: PaymentRequestDetail) => void;
}

export function RequestPaymentModal({
  isOpen,
  onClose,
  bookingId,
  bookingReference,
  customerName,
  customerPhone,
  balanceDuePesewas,
  onSuccess,
}: RequestPaymentModalProps) {
  // Amount selection
  const [amountMode, setAmountMode] = React.useState<"FULL" | "CUSTOM">("FULL");
  const [customAmountGhs, setCustomAmountGhs] = React.useState<string>(
    (balanceDuePesewas / 100).toFixed(2)
  );

  // Message & expiry
  const [message, setMessage] = React.useState<string>("");
  const [expiryMinutes, setExpiryMinutes] = React.useState<number>(1440); // 24h default

  // MoMo push options
  const [pushMomo, setPushMomo] = React.useState<boolean>(false);
  const [momoProvider, setMomoProvider] = React.useState<"MTN" | "TELECEL" | "AT">("MTN");
  const [phone, setPhone] = React.useState<string>(customerPhone || "");

  // Submission state
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Sync state on modal open
  const [prevIsOpen, setPrevIsOpen] = React.useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setAmountMode("FULL");
      setCustomAmountGhs((balanceDuePesewas / 100).toFixed(2));
      setMessage("");
      setExpiryMinutes(1440);
      setPushMomo(false);
      setPhone(customerPhone || "");
      setError(null);
    }
  }

  if (!isOpen) return null;

  const targetAmountPesewas =
    amountMode === "FULL"
      ? balanceDuePesewas
      : Math.round((parseFloat(customAmountGhs) || 0) * 100);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (targetAmountPesewas <= 0) {
      setError("Please specify a valid payment amount greater than zero.");
      return;
    }

    if (targetAmountPesewas > balanceDuePesewas) {
      setError(`Requested amount cannot exceed outstanding balance of ${formatPesewas(balanceDuePesewas)}.`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/admin/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          amountPesewas: targetAmountPesewas,
          message: message.trim() || undefined,
          phone: phone.trim() || undefined,
          pushMomo,
          momoProvider: pushMomo ? momoProvider : undefined,
          expiryMinutes,
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.paymentRequest) {
        onSuccess(json.data.paymentRequest);
        onClose();
      } else {
        setError(json.error?.message || "Failed to create payment request");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error sending payment request");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/80">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h3 className="text-base font-black text-[#1E1E1E]">Request Payment</h3>
            </div>
            <p className="text-xs text-zinc-500">
              Booking <strong className="text-zinc-800">{bookingReference}</strong> • {customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 text-xs border border-rose-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Amount Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Payment Amount
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAmountMode("FULL")}
                className={`p-3 rounded-2xl text-left border text-xs transition-all cursor-pointer ${
                  amountMode === "FULL"
                    ? "border-black bg-zinc-900 text-white shadow-sm"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <div className="font-extrabold">Full Balance</div>
                <div className="text-sm font-black mt-0.5">
                  {formatPesewas(balanceDuePesewas)}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAmountMode("CUSTOM")}
                className={`p-3 rounded-2xl text-left border text-xs transition-all cursor-pointer ${
                  amountMode === "CUSTOM"
                    ? "border-black bg-zinc-900 text-white shadow-sm"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                <div className="font-extrabold">Custom Amount</div>
                <div className="text-xs mt-0.5 opacity-80">
                  Partial or deposit settlement
                </div>
              </button>
            </div>

            {amountMode === "CUSTOM" && (
              <div className="pt-2">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-500">
                    GH₵
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    max={(balanceDuePesewas / 100).toFixed(2)}
                    value={customAmountGhs}
                    onChange={(e) => setCustomAmountGhs(e.target.value)}
                    placeholder="0.00"
                    className="pl-12 text-sm font-bold rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Remaining balance: {formatPesewas(balanceDuePesewas)}
                </p>
              </div>
            )}
          </div>

          {/* Expiry Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-zinc-700 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>Link Expiration</span>
            </Label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { min: 60, label: "1 hour" },
                { min: 360, label: "6 hours" },
                { min: 1440, label: "24 hours" },
                { min: 2880, label: "48 hours" },
              ].map((exp) => (
                <button
                  key={exp.min}
                  type="button"
                  onClick={() => setExpiryMinutes(exp.min)}
                  className={`py-2 px-1 text-center text-xs font-semibold rounded-xl border transition-colors cursor-pointer ${
                    expiryMinutes === exp.min
                      ? "bg-black text-white border-black"
                      : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {exp.label}
                </button>
              ))}
            </div>
          </div>

          {/* Optional Message */}
          <div className="space-y-1.5">
            <Label htmlFor="reqMessage" className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
              Message to Client (Optional)
            </Label>
            <textarea
              id="reqMessage"
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Please settle the remaining bridal balance before your appointment."
              className="w-full text-xs p-3 rounded-xl border border-zinc-300 focus:outline-none focus:border-black resize-none"
            />
          </div>

          {/* Mobile Money Push Charge Option */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={pushMomo}
                onChange={(e) => setPushMomo(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-zinc-300 text-black focus:ring-black cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  <span>Push Mobile Money Prompt via Paystack Charge API</span>
                </span>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  Immediately pops up an authorization prompt on the customer&apos;s phone to approve with their PIN.
                </p>
              </div>
            </label>

            {pushMomo && (
              <div className="pt-2 space-y-3 border-t border-zinc-200">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Customer MoMo Network
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "MTN", label: "MTN MoMo" },
                      { id: "TELECEL", label: "Telecel" },
                      { id: "AT", label: "AT Money" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setMomoProvider(p.id as "MTN" | "TELECEL" | "AT")}
                        className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-colors cursor-pointer text-center ${
                          momoProvider === p.id
                            ? "bg-amber-400 text-black border-amber-400"
                            : "bg-white text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Recipient Phone
                  </span>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0244123456"
                    className="text-xs rounded-xl"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outlinePill"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="blackPill"
              size="sm"
              disabled={isSubmitting}
              className="text-xs font-bold gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Dispatching Request...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Send Request ({formatPesewas(targetAmountPesewas)})</span>
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
