"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Clock,
  User,
  CreditCard,
  MapPin,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  XCircle,
  Download,
  ExternalLink,
  ShieldAlert,
  ArrowLeft,
  Crown,
} from "lucide-react";
import { formatPesewas } from "@/lib/money";

interface BookingData {
  id: string;
  reference: string;
  status: string;
  startUtc: string;
  endUtc: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  staffName: string;
  services: Array<{
    id: string;
    name: string;
    durationMin: number;
    pricePesewas: number;
  }>;
  totalDurationMin: number;
  subtotalPesewas: number;
  totalPesewas: number;
  depositRequiredPesewas: number;
  amountPaidPesewas: number;
  balanceDuePesewas: number;
  cancellationNoticeHours: number;
  canReschedule: boolean;
  rescheduleNoticeReason?: string;
  hasPendingPayment: boolean;
  refundPreview: {
    isBeforeCutoff: boolean;
    hoursRemaining: number;
    policyApplied: string;
    depositPaidPesewas: number;
    depositRefundPesewas: number;
    depositForfeitedPesewas: number;
    prepaymentRefundPesewas: number;
    totalRefundPesewas: number;
    cancellationNoticeHours: number;
    explanation: string;
  };
  calendarUrls: {
    google: string;
    icsDownload: string;
  };
}

function ManageBookingPageContent() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";

  const [booking, setBooking] = React.useState<BookingData | null>(null);
  const [loading, setLoading] = React.useState<boolean>(() => Boolean(token));
  const [error, setError] = React.useState<string | null>(() =>
    token ? null : "No manage token provided."
  );
  const [successNotice, setSuccessNotice] = React.useState<string | null>(null);

  // Reschedule state
  const [rescheduleModalOpen, setRescheduleModalOpen] = React.useState(false);
  const [rescheduleDate, setRescheduleDate] = React.useState("");
  const [rescheduleTime, setRescheduleTime] = React.useState("10:00");
  const [rescheduling, setRescheduling] = React.useState(false);
  const [rescheduleError, setRescheduleError] = React.useState<string | null>(null);

  // Cancel state
  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const [cancelReason, setCancelReason] = React.useState("");
  const [cancelling, setCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<string | null>(null);

  // Pay balance state
  const [payingBalance, setPayingBalance] = React.useState(false);

  const refetchBooking = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/manage/${encodeURIComponent(token)}`);
      const json = await res.json();
      if (json.success && json.data) {
        setBooking(json.data);
      }
    } catch {
      // quiet
    }
  }, [token]);

  React.useEffect(() => {
    if (!token) {
      return;
    }
    let isCurrent = true;
    fetch(`/api/manage/${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isCurrent) return;
        if (json.success && json.data) {
          setBooking(json.data);
        } else {
          setError(json.error?.message || "Booking not found or access link has expired.");
        }
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!isCurrent) return;
        setError(err instanceof Error ? err.message : "Failed to load booking.");
        setLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [token]);

  // Format Accra date & time
  const formatAccraDateTime = (isoString: string) => {
    const d = new Date(isoString);
    const dateFormatted = d.toLocaleDateString("en-GB", {
      timeZone: "Africa/Accra",
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = d.toLocaleTimeString("en-GB", {
      timeZone: "Africa/Accra",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { dateFormatted, timeFormatted };
  };

  const handlePayBalance = async () => {
    if (!booking) return;
    setPayingBalance(true);
    try {
      const res = await fetch(`/api/manage/${encodeURIComponent(token)}/pay-balance`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Could not initiate payment session.");
      }
      if (json.data?.authorizationUrl) {
        window.location.href = json.data.authorizationUrl;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Balance payment failed.");
      setPayingBalance(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate || !rescheduleTime) {
      setRescheduleError("Please select both a date and time.");
      return;
    }

    setRescheduling(true);
    setRescheduleError(null);

    try {
      // Build ISO UTC datetime from chosen Accra date/time
      const targetIsoString = new Date(`${rescheduleDate}T${rescheduleTime}:00Z`).toISOString();

      const res = await fetch(`/api/manage/${encodeURIComponent(token)}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newStartUtc: targetIsoString }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Could not reschedule to selected slot.");
      }

      setRescheduleModalOpen(false);
      setSuccessNotice("Your appointment has been successfully rescheduled!");
      await refetchBooking();
    } catch (err: unknown) {
      setRescheduleError(err instanceof Error ? err.message : "Failed to reschedule.");
    } finally {
      setRescheduling(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCancelling(true);
    setCancelError(null);

    try {
      const res = await fetch(`/api/manage/${encodeURIComponent(token)}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason.trim() || undefined }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Could not cancel appointment.");
      }

      setCancelModalOpen(false);
      setSuccessNotice(
        json.data?.alreadyCancelled
          ? "This booking was already cancelled."
          : `Appointment cancelled. Refund: ${formatPesewas(json.data?.refundAmountPesewas || 0)}`
      );
      await refetchBooking();
    } catch (err: unknown) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm text-neutral-400">Loading your appointment details...</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-8 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold font-serif text-white">Access Link Invalid or Expired</h2>
          <p className="text-sm text-neutral-400">
            {error || "We could not find a booking matching this link. It may have expired or been replaced."}
          </p>
          <button
            onClick={() => router.push("/manage")}
            className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-sm font-semibold transition"
          >
            Look Up Booking with Reference & Phone
          </button>
        </div>
      </div>
    );
  }

  const { dateFormatted, timeFormatted } = formatAccraDateTime(booking.startUtc);
  const isCancelled = booking.status === "CANCELLED";
  const isCompleted = booking.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.push("/manage")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Look Up Another Booking
          </button>
          <div className="flex items-center gap-2">
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                isCancelled
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                  : isCompleted
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                  : booking.status === "CONFIRMED"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              {booking.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Success Alert */}
        {successNotice && (
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Hero Card */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-6">
            <div>
              <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">
                Reference Code
              </span>
              <h1 className="text-3xl font-mono font-extrabold tracking-wider text-white">
                {booking.reference}
              </h1>
            </div>
            <div className="sm:text-right">
              <span className="text-xs uppercase tracking-widest text-neutral-400 block">
                Appointment Time (GMT)
              </span>
              <p className="text-lg font-semibold text-neutral-200">
                {dateFormatted} at {timeFormatted}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Assigned Specialist</span>
                <span className="text-sm font-semibold text-white">{booking.staffName}</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Duration</span>
                <span className="text-sm font-semibold text-white">{booking.totalDurationMin} mins</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-neutral-800 flex items-center justify-center text-amber-400">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs text-neutral-400 block">Location</span>
                <span className="text-sm font-semibold text-white truncate max-w-[160px] block">
                  Senchi St, Airport Accra
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Services & Financials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Services breakdown */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4">
            <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" /> Booked Services
            </h2>
            <div className="divide-y divide-neutral-800/80">
              {booking.services.map((svc) => (
                <div key={svc.id} className="py-3 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium text-white block">{svc.name}</span>
                    <span className="text-xs text-neutral-500">{svc.durationMin} minutes</span>
                  </div>
                  <span className="font-semibold text-amber-400">
                    {formatPesewas(svc.pricePesewas)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Payment breakdown */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-4 flex flex-col justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-white flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-amber-400" /> Payment & Balances
              </h2>
              <div className="space-y-2 mt-4 text-sm">
                <div className="flex justify-between text-neutral-400">
                  <span>Total Amount</span>
                  <span className="font-medium text-white">{formatPesewas(booking.totalPesewas)}</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Deposit Required</span>
                  <span className="font-medium text-white">
                    {formatPesewas(booking.depositRequiredPesewas)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Amount Paid</span>
                  <span className="font-medium text-emerald-400">
                    {formatPesewas(booking.amountPaidPesewas)}
                  </span>
                </div>
                <div className="flex justify-between text-neutral-200 pt-2 border-t border-neutral-800 font-bold">
                  <span>Outstanding Balance</span>
                  <span
                    className={booking.balanceDuePesewas > 0 ? "text-amber-400" : "text-emerald-400"}
                  >
                    {formatPesewas(booking.balanceDuePesewas)}
                  </span>
                </div>
              </div>
            </div>

            {booking.balanceDuePesewas > 0 && !isCancelled && (
              <button
                type="button"
                disabled={payingBalance}
                onClick={handlePayBalance}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition disabled:opacity-50"
              >
                {payingBalance ? "Initiating..." : `Pay Balance (${formatPesewas(booking.balanceDuePesewas)})`}
              </button>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="bg-neutral-900/80 border border-neutral-800 rounded-3xl p-6 space-y-4">
          <h2 className="text-base font-serif font-bold text-white">Appointment Controls</h2>

          <div className="flex flex-wrap gap-3">
            {/* Add to Calendar Button */}
            <div className="inline-flex rounded-xl bg-neutral-800 p-1 border border-neutral-700">
              <a
                href={booking.calendarUrls.icsDownload}
                download
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-700/60 inline-flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" /> Download (.ics)
              </a>
              <a
                href={booking.calendarUrls.google}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-200 hover:text-white hover:bg-neutral-700/60 inline-flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Google Calendar
              </a>
            </div>

            {/* Reschedule Button */}
            {!isCancelled && !isCompleted && (
              <button
                type="button"
                disabled={!booking.canReschedule}
                onClick={() => {
                  setRescheduleDate(booking.startUtc.split("T")[0]);
                  setRescheduleModalOpen(true);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition ${
                  booking.canReschedule
                    ? "bg-neutral-800 hover:bg-neutral-700 border-neutral-700 text-white cursor-pointer"
                    : "bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60"
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reschedule Appointment
              </button>
            )}

            {/* Cancel Button */}
            {!isCancelled && !isCompleted && (
              <button
                type="button"
                disabled={booking.hasPendingPayment}
                onClick={() => setCancelModalOpen(true)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 border transition ${
                  booking.hasPendingPayment
                    ? "bg-neutral-900 border-neutral-800 text-neutral-500 cursor-not-allowed opacity-60"
                    : "bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300 cursor-pointer"
                }`}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancel Appointment
              </button>
            )}
          </div>

          {!booking.canReschedule && !isCancelled && !isCompleted && booking.rescheduleNoticeReason && (
            <p className="text-xs text-amber-400/90 flex items-center gap-1.5 pt-1">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {booking.rescheduleNoticeReason}
            </p>
          )}

          {booking.hasPendingPayment && !isCancelled && (
            <p className="text-xs text-amber-400/90 flex items-center gap-1.5 pt-1">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              A payment transaction is currently pending. Cancellations are temporarily paused until it settles.
            </p>
          )}
        </div>
      </div>

      {/* RESCHEDULE MODAL */}
      {rescheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-serif font-bold text-white">Reschedule Appointment</h3>
                <p className="text-xs text-neutral-400">
                  Select a new date and time with {booking.staffName}.
                </p>
              </div>
              <button
                onClick={() => setRescheduleModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {rescheduleError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {rescheduleError}
              </div>
            )}

            <form onSubmit={handleRescheduleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">New Date</label>
                <input
                  type="date"
                  required
                  value={rescheduleDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">New Time</label>
                <select
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="09:00">09:00 AM</option>
                  <option value="10:00">10:00 AM</option>
                  <option value="11:00">11:00 AM</option>
                  <option value="12:00">12:00 PM</option>
                  <option value="13:00">01:00 PM</option>
                  <option value="14:00">02:00 PM</option>
                  <option value="15:00">03:00 PM</option>
                  <option value="16:00">04:00 PM</option>
                  <option value="17:00">05:00 PM</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRescheduleModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rescheduling}
                  className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-semibold disabled:opacity-50"
                >
                  {rescheduling ? "Confirming..." : "Confirm New Slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCELLATION MODAL */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-serif font-bold text-white">Cancel Appointment</h3>
                <p className="text-xs text-neutral-400">
                  Please review the refund calculation according to studio policy.
                </p>
              </div>
              <button
                onClick={() => setCancelModalOpen(false)}
                className="text-neutral-500 hover:text-white"
              >
                ✕
              </button>
            </div>

            {cancelError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {cancelError}
              </div>
            )}

            {/* Policy Refund Preview Box */}
            <div className="p-4 rounded-2xl bg-neutral-950 border border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Policy Notice Window:</span>
                <span className="font-semibold text-white">
                  {booking.refundPreview.cancellationNoticeHours} Hours
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Hours Remaining:</span>
                <span className="font-semibold text-white">
                  {booking.refundPreview.hoursRemaining}h
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Deposit Forfeiture:</span>
                <span className="font-semibold text-rose-400">
                  {formatPesewas(booking.refundPreview.depositForfeitedPesewas)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Prepayment Refund:</span>
                <span className="font-semibold text-white">
                  {formatPesewas(booking.refundPreview.prepaymentRefundPesewas)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-800 font-bold text-sm">
                <span className="text-white">Total Refund Amount:</span>
                <span className="text-emerald-400">
                  {formatPesewas(booking.refundPreview.totalRefundPesewas)}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 pt-1 border-t border-neutral-900">
                {booking.refundPreview.explanation}
              </p>
            </div>

            <form onSubmit={handleCancelSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1">
                  Reason for Cancellation (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Schedule conflict..."
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="w-1/2 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs font-semibold text-neutral-300"
                >
                  Keep Booking
                </button>
                <button
                  type="submit"
                  disabled={cancelling}
                  className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold disabled:opacity-50"
                >
                  {cancelling ? "Processing..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ManageBookingPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
            <p className="text-sm text-neutral-400">Loading your appointment details...</p>
          </div>
        </div>
      }
    >
      <ManageBookingPageContent />
    </React.Suspense>
  );
}
