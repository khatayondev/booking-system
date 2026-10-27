"use client";

import * as React from "react";
import Link from "next/link";
import { CreditCard, ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPesewas } from "@/lib/money";

interface PaymentRequestBannerProps {
  reference: string;
  onPaymentSettled?: () => void;
}

interface BannerRequestData {
  id: string;
  amountPesewas: number;
  message?: string;
  payUrl?: string;
}

export function PaymentRequestBanner({
  reference,
  onPaymentSettled,
}: PaymentRequestBannerProps) {
  const [activeRequest, setActiveRequest] = React.useState<BannerRequestData | null>(null);
  const [isPaid, setIsPaid] = React.useState(false);

  // Subscribe to real-time events for this booking via SSE
  React.useEffect(() => {
    if (!reference) return;

    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(
        `/api/booking/events?ref=${encodeURIComponent(reference)}`
      );

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "PAYMENT_REQUEST_SENT") {
            setActiveRequest({
              id: data.paymentRequestId,
              amountPesewas: data.amountPesewas,
              message: data.message,
              payUrl: data.payUrl || (data.shortCode ? `/pay/r/${data.shortCode}` : undefined),
            });
            setIsPaid(false);
          } else if (data.type === "PAYMENT_REQUEST_PAID") {
            setIsPaid(true);
            setTimeout(() => {
              setActiveRequest(null);
              if (onPaymentSettled) onPaymentSettled();
            }, 3000);
          } else if (data.type === "PAYMENT_REQUEST_CANCELLED") {
            setActiveRequest(null);
          }
        } catch (err) {
          console.error("Error parsing booking event", err);
        }
      };

      eventSource.onerror = () => {
        // EventSource will auto-reconnect
      };
    } catch (err) {
      console.error("Failed to connect to booking SSE stream", err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [reference, onPaymentSettled]);

  if (!activeRequest && !isPaid) {
    return null;
  }

  if (isPaid) {
    return (
      <div
        data-testid="payment-request-paid-banner"
        className="w-full p-4 mb-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3 shadow-sm animate-in fade-in slide-in-from-top duration-300"
      >
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <p className="text-xs font-bold">Payment Settled Successfully!</p>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
              Your payment has been received and your booking balance is updated.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="payment-request-banner"
      className="w-full p-4 mb-4 rounded-2xl bg-gradient-to-r from-zinc-900 via-black to-zinc-900 text-white border border-zinc-700/80 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 animate-in fade-in slide-in-from-top duration-300"
    >
      <div className="flex items-start sm:items-center gap-3">
        <div className="p-2 bg-white/10 rounded-xl text-amber-400 shrink-0 mt-0.5 sm:mt-0">
          <CreditCard className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-white tracking-tight">
              Payment Request Received
            </span>
            <span className="bg-amber-400/20 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5" />
              <span>Due Now • {formatPesewas(activeRequest!.amountPesewas)}</span>
            </span>
          </div>
          <p className="text-[11px] text-zinc-300 mt-0.5">
            {activeRequest!.message || "The studio has sent a payment request for your appointment."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Link href={activeRequest?.payUrl || `/booking/pay-balance?ref=${encodeURIComponent(reference)}`}>
          <Button
            size="sm"
            data-testid="pay-now-banner-btn"
            className="bg-white hover:bg-zinc-100 text-zinc-900 font-bold rounded-xl text-xs h-9 px-4 shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <span>Pay {formatPesewas(activeRequest!.amountPesewas)} Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
