"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPesewas } from "@/lib/money";
import { BookingVerifyData } from "@/lib/payments/types";
import { PaymentRequestBanner } from "@/components/payment-requests/payment-request-banner";

function BookingConfirmationContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref") || searchParams.get("reference");

  const [loading, setLoading] = React.useState(() => Boolean(reference));
  const [data, setData] = React.useState<BookingVerifyData | null>(null);
  const [error, setError] = React.useState<string | null>(() =>
    reference ? null : "No transaction reference provided."
  );

  React.useEffect(() => {
    if (!reference) {
      return;
    }

    let isMounted = true;
    fetch(`/api/payments/verify?ref=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data) {
          setData(json.data);
        } else {
          setError(json.error?.message || "Could not verify payment transaction");
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to verify transaction";
        setError(msg);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reference]);

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 border-3 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto" />
        <h2 className="text-lg font-bold text-[#1E1E1E]">Verifying Payment with Paystack...</h2>
        <p className="text-xs text-[#71717A]">
          Connecting securely to reconcile your Mobile Money / Card settlement.
        </p>
      </div>
    );
  }

  if (error || !data?.verified) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="white" className="p-8 text-center space-y-5 rounded-[32px] border border-rose-200 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-700 mx-auto flex items-center justify-center">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-black text-[#1E1E1E]">Payment Verification Issue</h1>
            <p className="text-xs text-[#71717A]">
              {error || data?.message || "Payment was not settled successfully."}
            </p>
          </div>
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/book">
              <Button variant="blackPill" size="md" className="w-full text-xs font-bold cursor-pointer">
                Return to Booking Wizard
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="outlinePill" size="md" className="w-full text-xs font-semibold cursor-pointer">
                Contact Studio Support
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const b = data.booking;
  const balanceDue = b ? Math.max(0, b.totalPesewas - b.amountPaidPesewas) : 0;

  return (
    <div className="max-w-2xl mx-auto py-8 sm:py-12 px-4 space-y-6">
      {/* Real-time Payment Request Banner */}
      <PaymentRequestBanner
        reference={b?.reference || (reference as string) || ""}
        onPaymentSettled={() => {
          if (reference) {
            fetch(`/api/payments/verify?ref=${encodeURIComponent(reference)}`)
              .then((res) => res.json())
              .then((json) => {
                if (json.success && json.data) setData(json.data);
              })
              .catch(() => {});
          }
        }}
      />

      <Card variant="white" className="p-6 sm:p-8 text-center space-y-6 rounded-[32px] shadow-lg border border-black/10">
        <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-[11px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
            Payment & Booking Confirmed
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1E1E] tracking-tight">
            You&apos;re All Set!
          </h1>
          {b?.reference && (
            <p className="text-xs text-[#71717A]">
              Booking Reference:{" "}
              <strong className="text-base text-[#1E1E1E] font-black tracking-wider">
                {b.reference}
              </strong>
            </p>
          )}
        </div>

        {/* Appointment Breakdown */}
        {b && (
          <div className="p-5 rounded-2xl bg-[#F4F4F6] text-left space-y-3 text-xs">
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-[#71717A]">Client:</span>
              <span className="font-bold text-[#1E1E1E]">{b.customerName}</span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-[#71717A]">Phone:</span>
              <span className="font-bold text-[#1E1E1E]">{b.customerPhone}</span>
            </div>
            {/* Solo direct shop mode: Stylist row omitted
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-[#71717A]">Assigned Stylist:</span>
              <span className="font-bold text-[#1E1E1E]">{b.staffName}</span>
            </div>
            */}
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-[#71717A]">Date & Time:</span>
              <span className="font-extrabold text-[#1E1E1E]">
                {new Date(b.startUtc).toLocaleDateString("en-GB", {
                  timeZone: "Africa/Accra",
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                at{" "}
                {new Date(b.startUtc).toLocaleTimeString("en-GB", {
                  timeZone: "Africa/Accra",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2">
              <span className="text-[#71717A]">Total Amount:</span>
              <span className="font-bold text-[#1E1E1E]">{formatPesewas(b.totalPesewas)}</span>
            </div>
            <div className="flex justify-between border-b border-black/5 pb-2 text-emerald-800">
              <span className="font-bold">Paid Online (Paystack):</span>
              <span className="font-extrabold">{formatPesewas(b.amountPaidPesewas)}</span>
            </div>
            {balanceDue > 0 ? (
              <div className="flex justify-between pt-1 text-amber-900 font-bold">
                <span>Remaining Balance Due:</span>
                <span className="font-black text-sm">{formatPesewas(balanceDue)}</span>
              </div>
            ) : (
              <div className="flex justify-between pt-1 text-emerald-800 font-bold">
                <span>Payment Status:</span>
                <span className="font-black">Fully Paid</span>
              </div>
            )}
          </div>
        )}

        {/* Balance Payment Callout if deposit only */}
        {balanceDue > 0 && b && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-900 text-xs font-bold">
              <CreditCard className="w-4 h-4" />
              <span>Want to settle your remaining balance before you arrive?</span>
            </div>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              You can pay the remaining {formatPesewas(balanceDue)} online anytime before your appointment using Mobile Money or Card.
            </p>
            <div className="pt-1">
              <Link href={`/booking/pay-balance?ref=${b.reference}`}>
                <Button
                  size="sm"
                  className="bg-amber-900 hover:bg-amber-950 text-white rounded-full text-xs font-bold px-4 h-8 cursor-pointer gap-1"
                >
                  <span>Pay Remaining Balance Online</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Studio Info */}
        <div className="text-left space-y-2 text-xs text-[#71717A] border-t border-black/5 pt-4">
          <p className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Instant SMS booking confirmation dispatched to {b?.customerPhone}.</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#1E1E1E] shrink-0" />
            <span>Becca&apos;s Crown: Lagos Avenue, East Legon, Accra.</span>
          </p>
          <p className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#1E1E1E] shrink-0" />
            <span>Please arrive 10 minutes prior to your scheduled time.</span>
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <Link href="/book" className="flex-1">
            <Button variant="blackPill" size="md" className="w-full text-xs font-bold cursor-pointer">
              Book Another Appointment
            </Button>
          </Link>
          <Link href="/" className="flex-1">
            <Button variant="outlinePill" size="md" className="w-full text-xs font-semibold cursor-pointer">
              Return to Home
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}

export default function BookingConfirmationPage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-xl mx-auto py-16 px-4 text-center">
          <div className="w-12 h-12 border-3 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <BookingConfirmationContent />
    </React.Suspense>
  );
}
