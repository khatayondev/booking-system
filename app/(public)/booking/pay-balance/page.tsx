"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  CreditCard,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPesewas } from "@/lib/money";
import { BookingSummaryData } from "@/lib/payments/types";

function PayBalanceContent() {
  const searchParams = useSearchParams();
  const reference = searchParams.get("ref") || searchParams.get("reference");

  const [loading, setLoading] = React.useState(() => Boolean(reference));
  const [booking, setBooking] = React.useState<BookingSummaryData | null>(null);
  const [error, setError] = React.useState<string | null>(() =>
    reference ? null : "No booking reference provided."
  );
  const [paying, setPaying] = React.useState(false);

  React.useEffect(() => {
    if (!reference) {
      return;
    }

    let isMounted = true;
    fetch(`/api/payments/verify?ref=${encodeURIComponent(reference)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data?.booking) {
          setBooking(json.data.booking);
        } else {
          setError(json.error?.message || "Could not retrieve booking details");
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : "Failed to load booking";
        setError(msg);
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [reference]);

  const handlePayBalance = async () => {
    if (!booking) return;

    try {
      setPaying(true);
      setError(null);

      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: booking.id,
          paymentType: "BALANCE",
        }),
      });

      const json = await res.json();
      if (json.success && json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
      } else {
        setError(json.error?.message || "Could not initiate balance payment");
        setPaying(false);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment initialization error";
      setError(msg);
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-4">
        <div className="w-12 h-12 border-3 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-[#71717A]">Loading appointment balance details...</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="white" className="p-8 text-center space-y-4 rounded-[32px] border border-rose-200">
          <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
          <h1 className="text-lg font-bold text-[#1E1E1E]">Could Not Find Booking</h1>
          <p className="text-xs text-[#71717A]">{error || "Invalid booking reference."}</p>
          <div className="pt-2">
            <Link href="/book">
              <Button variant="blackPill" size="sm" className="text-xs cursor-pointer">
                Return to Booking
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const balanceDue = Math.max(0, booking.totalPesewas - booking.amountPaidPesewas);

  if (balanceDue === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <Card variant="white" className="p-8 text-center space-y-4 rounded-[32px] border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
          <h1 className="text-xl font-black text-[#1E1E1E]">Booking is Fully Paid!</h1>
          <p className="text-xs text-[#71717A]">
            No outstanding balance remains for booking <span className="font-bold">{booking.reference}</span>.
          </p>
          <div className="pt-2">
            <Link href={`/booking/confirmation?ref=${booking.reference}`}>
              <Button variant="blackPill" size="sm" className="text-xs cursor-pointer">
                View Booking Confirmation
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 space-y-6">
      <Card variant="white" className="p-6 sm:p-8 space-y-6 rounded-[32px] shadow-lg border border-black/10">
        <div className="text-center space-y-2">
          <span className="inline-block px-3 py-1 rounded-full bg-amber-50 text-[11px] font-bold uppercase tracking-wider text-amber-900 border border-amber-200">
            Outstanding Appointment Balance
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1E1E1E]">
            Settle Remaining Balance
          </h1>
          <p className="text-xs text-[#71717A]">
            Booking Reference: <strong className="text-[#1E1E1E]">{booking.reference}</strong>
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
            {error}
          </div>
        )}

        <div className="p-5 rounded-2xl bg-[#F4F4F6] space-y-3 text-xs">
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="text-[#71717A]">Client:</span>
            <span className="font-bold text-[#1E1E1E]">{booking.customerName}</span>
          </div>
          <div className="flex justify-between border-b border-black/5 pb-2">
            <span className="text-[#71717A]">Total Service Price:</span>
            <span className="font-bold text-[#1E1E1E]">{formatPesewas(booking.totalPesewas)}</span>
          </div>
          <div className="flex justify-between border-b border-black/5 pb-2 text-emerald-800">
            <span className="font-bold">Deposit Already Paid:</span>
            <span className="font-extrabold">{formatPesewas(booking.amountPaidPesewas)}</span>
          </div>
          <div className="flex justify-between pt-1 text-base font-black text-[#1E1E1E]">
            <span>Balance Due Now:</span>
            <span className="text-lg">{formatPesewas(balanceDue)}</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="blackPill"
            size="lg"
            disabled={paying}
            onClick={handlePayBalance}
            className="w-full text-xs font-bold gap-2 cursor-pointer shadow-md bg-[#1E1E1E] text-white hover:bg-black h-12"
          >
            <CreditCard className="w-4 h-4" />
            <span>
              {paying ? "Redirecting to Paystack..." : `Pay ${formatPesewas(balanceDue)} via Paystack`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-[11px] text-center text-[#71717A]">
            Secured by Paystack. Supports MTN MoMo, Telecel Cash, AT Money, and Visa/Mastercard.
          </p>
        </div>
      </Card>
    </div>
  );
}

export default function PayBalancePage() {
  return (
    <React.Suspense
      fallback={
        <div className="max-w-xl mx-auto py-16 px-4 text-center">
          <div className="w-12 h-12 border-3 border-[#1E1E1E] border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <PayBalanceContent />
    </React.Suspense>
  );
}
