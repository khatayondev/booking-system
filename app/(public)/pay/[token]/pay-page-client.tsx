"use client";

import * as React from "react";
import Link from "next/link";
import {
  CreditCard,
  Smartphone,
  ShieldCheck,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/controls";
import { formatPesewas } from "@/lib/money";
import type { PublicPaymentRequestView } from "@/lib/payment-requests/types";

export function PublicPaymentRequestClient({ token }: { token: string }) {
  const [loading, setLoading] = React.useState(true);
  const [request, setRequest] = React.useState<PublicPaymentRequestView | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Payment form states
  const [paymentMethod, setPaymentMethod] = React.useState<"MOBILE_MONEY" | "CARD">("MOBILE_MONEY");
  const [momoProvider, setMomoProvider] = React.useState<"MTN" | "TELECEL" | "AT">("MTN");
  const [momoPhone, setMomoPhone] = React.useState("");
  const [cardNumber, setCardNumber] = React.useState("");
  const [cardExpiry, setCardExpiry] = React.useState("");
  const [cardCvv, setCardCvv] = React.useState("");
  const [cardName, setCardName] = React.useState("");

  // Submission state
  const [submitting, setSubmitting] = React.useState(false);
  const [payError, setPayError] = React.useState<string | null>(null);
  const [receiptResult, setReceiptResult] = React.useState<{
    receiptNumber: string;
    receiptUrl: string;
    newAmountPaidPesewas: number;
    remainingBalancePesewas: number;
  } | null>(null);

  // Time remaining countdown
  const [timeLeft, setTimeLeft] = React.useState<string>("");

  // Fetch payment request on mount
  React.useEffect(() => {
    let isMounted = true;
    fetch(`/api/pay/${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isMounted) return;
        if (json.success && json.data?.redirectUrl) {
          window.location.href = json.data.redirectUrl;
          return;
        }
        if (json.success && json.data?.paymentRequest) {
          const reqData: PublicPaymentRequestView = json.data.paymentRequest;
          setRequest(reqData);
          if (reqData.customerPhone) {
            setMomoPhone(reqData.customerPhone);
          }
        } else {
          setError(json.error?.message || "Invalid or expired payment link");
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to load payment details");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Expiry timer
  React.useEffect(() => {
    if (!request?.expiresAt) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const expires = new Date(request.expiresAt).getTime();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((diff % (1000 * 60)) / 1000);
        if (hours > 0) {
          setTimeLeft(`${hours}h ${mins}m`);
        } else {
          setTimeLeft(`${mins}m ${secs}s`);
        }
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [request?.expiresAt]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!request) return;

    try {
      setSubmitting(true);
      setPayError(null);

      const payload = {
        method: paymentMethod,
        phone: paymentMethod === "MOBILE_MONEY" ? momoPhone : undefined,
        provider: paymentMethod === "MOBILE_MONEY" ? momoProvider : undefined,
        cardReference: paymentMethod === "CARD" ? `CARD-${Date.now()}` : undefined,
      };

      const res = await fetch(`/api/pay/${encodeURIComponent(token)}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setReceiptResult({
          receiptNumber: json.data.receiptNumber,
          receiptUrl: json.data.receiptUrl,
          newAmountPaidPesewas: json.data.newAmountPaidPesewas,
          remainingBalancePesewas: json.data.remainingBalancePesewas,
        });
      } else {
        setPayError(json.error?.message || "Payment processing failed. Please try again.");
      }
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Payment submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-zinc-100 flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-400 font-medium">Securing payment connection...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-zinc-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-4 shadow-2xl">
          <div className="w-12 h-12 rounded-full bg-rose-950 text-rose-400 mx-auto flex items-center justify-center border border-rose-800">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-white">Payment Request Unavailable</h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            {error || "This payment request cannot be found or has already expired."}
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white underline underline-offset-4"
            >
              Return to Ghana and Beyond
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Already Paid or newly Paid View
  if (receiptResult || request.status === "PAID") {
    const rNum = receiptResult?.receiptNumber || "PAID";
    const balance = receiptResult
      ? receiptResult.remainingBalancePesewas
      : request.remainingBalancePesewas;

    return (
      <div className="min-h-screen bg-[#0E0E10] text-zinc-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-emerald-950 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-800 animate-in zoom-in-75 duration-200">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-tight text-white">Payment Received!</h1>
            <p className="text-xs text-zinc-400">
              Thank you, <strong className="text-white">{request.customerName}</strong>. Your payment of{" "}
              <strong className="text-emerald-400">{formatPesewas(request.amountPesewas)}</strong> has been
              processed successfully.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-left space-y-2.5 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Booking Reference:</span>
              <span className="font-mono font-bold text-white">{request.bookingReference}</span>
            </div>
            {receiptResult?.receiptNumber && (
              <div className="flex justify-between text-zinc-400">
                <span>Receipt Number:</span>
                <span className="font-mono font-bold text-emerald-400">{rNum}</span>
              </div>
            )}
            <div className="flex justify-between text-zinc-400 pt-2 border-t border-zinc-800">
              <span>Remaining Balance:</span>
              <span className="font-bold text-white">{formatPesewas(balance)}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {receiptResult?.receiptUrl && (
              <a
                href={receiptResult.receiptUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-4 rounded-full bg-white text-black text-xs font-black flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors"
              >
                <span>View Official Thermal Receipt</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}

            <Link
              href={`/booking/confirmation?ref=${encodeURIComponent(request.bookingReference)}`}
              className="w-full py-3 px-4 rounded-full bg-zinc-800 text-zinc-200 text-xs font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-colors"
            >
              <span>View Appointment Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  // Expired or Cancelled
  if (request.status === "EXPIRED" || request.status === "CANCELLED") {
    return (
      <div className="min-h-screen bg-[#0E0E10] text-zinc-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 rounded-3xl bg-zinc-900 border border-zinc-800 text-center space-y-4 shadow-2xl">
          <div className="w-14 h-14 rounded-full bg-amber-950 text-amber-400 mx-auto flex items-center justify-center border border-amber-800">
            <Clock className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black tracking-tight text-white">
            Payment Request {request.status === "CANCELLED" ? "Cancelled" : "Expired"}
          </h1>
          <p className="text-xs text-zinc-400 leading-relaxed">
            This payment request is no longer active. If you still have an outstanding balance on booking{" "}
            <strong className="text-white">{request.bookingReference}</strong>, please contact Ghana and Beyond or
            visit your private booking page to request a new link.
          </p>
          <div className="pt-2">
            <Link
              href={`/booking/confirmation?ref=${encodeURIComponent(request.bookingReference)}`}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-300 hover:text-white underline underline-offset-4"
            >
              <span>View Private Booking Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E0E10] text-zinc-100 py-10 px-4 sm:px-6">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Salon Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[11px] font-semibold text-zinc-300 tracking-wide">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Ghana and Beyond • Secure Checkout</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Complete Your Payment
          </h1>
          <p className="text-xs text-zinc-400">
            Booking <span className="font-mono font-bold text-zinc-200">{request.bookingReference}</span> for{" "}
            <span className="font-semibold text-zinc-200">{request.customerName}</span>
          </p>
        </div>

        {/* Custom Salon Message (if any) */}
        {request.message && (
          <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-3">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider block">
                Message from Salon
              </span>
              <p className="mt-0.5 leading-relaxed italic">&ldquo;{request.message}&rdquo;</p>
            </div>
          </div>
        )}

        {/* Amount Due Card */}
        <Card className="p-6 rounded-3xl bg-gradient-to-b from-zinc-900 to-zinc-950 border border-zinc-800 text-center space-y-3 shadow-2xl relative overflow-hidden">
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Amount to Pay</div>
          <div className="text-4xl sm:text-5xl font-black text-white tracking-tight">
            {formatPesewas(request.amountPesewas)}
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-zinc-400 pt-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Expires in: <strong>{timeLeft || "24 hours"}</strong></span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>256-Bit Encrypted</span>
            </span>
          </div>
        </Card>

        {/* Booking Summary Accordion */}
        <Card className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
            <span className="font-bold text-zinc-300 uppercase tracking-wider text-[11px]">
              Appointment Overview
            </span>
            <span className="text-zinc-400 font-mono text-[10px]">{request.bookingReference}</span>
          </div>

          <div className="space-y-1.5 text-zinc-300">
            {request.services.map((s, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span>{s.name}</span>
                <span className="font-bold text-white">{formatPesewas(s.pricePesewas)}</span>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-zinc-800 text-zinc-400 space-y-1">
            <div className="flex justify-between">
              <span>Total Booking Cost:</span>
              <span className="font-semibold text-zinc-200">{formatPesewas(request.totalBookingPesewas)}</span>
            </div>
            <div className="flex justify-between">
              <span>Already Settled:</span>
              <span className="font-semibold text-emerald-400">{formatPesewas(request.amountPaidPesewas)}</span>
            </div>
            <div className="flex justify-between text-zinc-200 font-bold">
              <span>Total Remaining Balance:</span>
              <span>{formatPesewas(request.remainingBalancePesewas)}</span>
            </div>
          </div>
        </Card>

        {/* Payment Form */}
        <Card className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-5 shadow-xl">
          {payError && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 text-rose-300 border border-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{payError}</span>
            </div>
          )}

          {/* Payment Method Switcher */}
          <div>
            <Label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block mb-2">
              Select Payment Method
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("MOBILE_MONEY")}
                className={`py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === "MOBILE_MONEY"
                    ? "bg-white text-black border-white shadow-lg"
                    : "bg-zinc-800/60 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>Mobile Money</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod("CARD")}
                className={`py-3 px-4 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                  paymentMethod === "CARD"
                    ? "bg-white text-black border-white shadow-lg"
                    : "bg-zinc-800/60 text-zinc-300 border-zinc-700/60 hover:bg-zinc-800"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card (Debit/Credit)</span>
              </button>
            </div>
          </div>

          <form onSubmit={handlePay} className="space-y-4">
            {paymentMethod === "MOBILE_MONEY" ? (
              <>
                {/* Network Picker */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Network Provider
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "MTN", label: "MTN MoMo" },
                      { id: "TELECEL", label: "Telecel" },
                      { id: "AT", label: "AT Money" },
                    ].map((net) => (
                      <button
                        key={net.id}
                        type="button"
                        onClick={() => setMomoProvider(net.id as "MTN" | "TELECEL" | "AT")}
                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer text-center ${
                          momoProvider === net.id
                            ? "bg-amber-400 text-black border-amber-400"
                            : "bg-zinc-950/60 text-zinc-300 border-zinc-800 hover:bg-zinc-800"
                        }`}
                      >
                        {net.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Money Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="momoPhone" className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Mobile Money Wallet Number
                  </Label>
                  <Input
                    id="momoPhone"
                    type="tel"
                    required
                    placeholder="e.g. 0244123456"
                    value={momoPhone}
                    onChange={(e) => setMomoPhone(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl text-xs"
                  />
                  <p className="text-[11px] text-zinc-500">
                    A prompt will be pushed directly to this handset to confirm with your secret PIN.
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Cardholder Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="cardName" className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Cardholder Name
                  </Label>
                  <Input
                    id="cardName"
                    type="text"
                    required
                    placeholder="e.g. Ama Mensah"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl text-xs"
                  />
                </div>

                {/* Card Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="cardNumber" className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Card Number
                  </Label>
                  <Input
                    id="cardNumber"
                    type="text"
                    required
                    placeholder="•••• •••• •••• ••••"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    className="bg-zinc-950 border-zinc-800 text-white rounded-xl text-xs font-mono"
                  />
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="cardExpiry" className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      Expiry (MM/YY)
                    </Label>
                    <Input
                      id="cardExpiry"
                      type="text"
                      required
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white rounded-xl text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="cardCvv" className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                      CVV
                    </Label>
                    <Input
                      id="cardCvv"
                      type="password"
                      maxLength={4}
                      required
                      placeholder="•••"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 text-white rounded-xl text-xs font-mono"
                    />
                  </div>
                </div>
              </>
            )}

            <Button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-full bg-white text-black text-xs font-black hover:bg-zinc-200 transition-colors cursor-pointer mt-4"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Authorizing Payment...</span>
                </div>
              ) : (
                <span>Pay {formatPesewas(request.amountPesewas)} Now</span>
              )}
            </Button>
          </form>

          <div className="pt-2 text-center text-[10px] text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Encrypted with 256-bit hash token. Powered by Paystack Ghana.</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
