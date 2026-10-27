"use client";

import * as React from "react";
import {
  Send,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Copy,
  Check,
  RotateCcw,
  ExternalLink,
  Smartphone,
} from "lucide-react";
import { formatPesewas } from "@/lib/money";
import type { PaymentRequestDetail, PaymentRequestStatus } from "@/lib/payment-requests/types";

interface PaymentRequestsListProps {
  bookingId: string;
  onBalanceChange?: () => void;
}

export function PaymentRequestsList({
  bookingId,
  onBalanceChange,
}: PaymentRequestsListProps) {
  const [requests, setRequests] = React.useState<PaymentRequestDetail[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(null);
  const [notification, setNotification] = React.useState<{
    id: string;
    message: string;
    type: "info" | "success" | "warning";
  } | null>(null);

  // Fetch requests for this booking
  const loadRequests = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/payment-requests?bookingId=${bookingId}`);
      const json = await res.json();
      if (json.success && json.data?.paymentRequests) {
        setRequests(json.data.paymentRequests);
      }
    } catch {
      // quiet error
    } finally {
      setLoading(false);
    }
  }, [bookingId]);

  React.useEffect(() => {
    let ignore = false;
    fetch(`/api/admin/payment-requests?bookingId=${bookingId}`)
      .then((res) => res.json())
      .then((json) => {
        if (!ignore && json.success && json.data?.paymentRequests) {
          setRequests(json.data.paymentRequests);
        }
        if (!ignore) setLoading(false);
      })
      .catch(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [bookingId]);

  // Subscribe to SSE stream for real-time status updates
  React.useEffect(() => {
    let es: EventSource | null = null;
    try {
      es = new EventSource("/api/admin/bookings/events");

      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          if (!data || !data.type) return;

          // Check if this event pertains to our booking
          if (data.bookingId === bookingId) {
            if (data.type === "PAYMENT_REQUEST_SENT") {
              setNotification({
                id: data.paymentRequestId || Date.now().toString(),
                message: `Payment request for ${formatPesewas(data.amountPesewas || 0)} sent via SMS!`,
                type: "info",
              });
              loadRequests();
            } else if (data.type === "PAYMENT_REQUEST_VIEWED") {
              setNotification({
                id: data.paymentRequestId || Date.now().toString(),
                message: `Customer viewed payment link for ${formatPesewas(data.amountPesewas || 0)}!`,
                type: "info",
              });
              // Update status directly in state
              setRequests((prev) =>
                prev.map((r) =>
                  r.id === data.paymentRequestId
                    ? { ...r, status: "VIEWED" as PaymentRequestStatus, viewedAt: data.timestamp }
                    : r
                )
              );
            } else if (data.type === "PAYMENT_REQUEST_PAID") {
              setNotification({
                id: data.paymentRequestId || Date.now().toString(),
                message: `Payment Received! ${formatPesewas(data.amountPesewas || 0)} paid by customer.`,
                type: "success",
              });
              setRequests((prev) =>
                prev.map((r) =>
                  r.id === data.paymentRequestId
                    ? { ...r, status: "PAID" as PaymentRequestStatus, paidAt: data.timestamp }
                    : r
                )
              );
              onBalanceChange?.();
            } else if (data.type === "PAYMENT_REQUEST_CANCELLED") {
              setNotification({
                id: data.paymentRequestId || Date.now().toString(),
                message: "Payment request cancelled.",
                type: "warning",
              });
              setRequests((prev) =>
                prev.map((r) =>
                  r.id === data.paymentRequestId
                    ? { ...r, status: "CANCELLED" as PaymentRequestStatus, cancelledAt: data.timestamp }
                    : r
                )
              );
            } else if (data.type === "PAYMENT_REQUEST_EXPIRED") {
              setRequests((prev) =>
                prev.map((r) =>
                  r.id === data.paymentRequestId
                    ? { ...r, status: "EXPIRED" as PaymentRequestStatus }
                    : r
                )
              );
            }
          }
        } catch {
          // Ignore parsing errors
        }
      };
    } catch {
      // EventSource failed or unsupported
    }

    return () => {
      if (es) {
        es.close();
      }
    };
  }, [bookingId, loadRequests, onBalanceChange]);

  // Copy link helper
  const handleCopy = (req: PaymentRequestDetail) => {
    const url = req.shortUrl || req.payUrl;
    navigator.clipboard.writeText(url);
    setCopiedId(req.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Resend action
  const handleResend = async (requestId: string) => {
    try {
      setActionLoadingId(requestId);
      const res = await fetch(`/api/admin/payment-requests/${requestId}/resend`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          id: requestId,
          message: "Payment request link re-sent via SMS!",
          type: "success",
        });
        await loadRequests();
      } else {
        alert(json.error?.message || "Failed to resend request");
      }
    } catch {
      alert("Failed to resend payment request");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Cancel action
  const handleCancel = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this payment request? The customer link will immediately become invalid.")) {
      return;
    }

    try {
      setActionLoadingId(requestId);
      const res = await fetch(`/api/admin/payment-requests/${requestId}/cancel`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        setNotification({
          id: requestId,
          message: "Payment request cancelled.",
          type: "warning",
        });
        await loadRequests();
      } else {
        alert(json.error?.message || "Failed to cancel request");
      }
    } catch {
      alert("Failed to cancel payment request");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-4 text-center text-xs text-zinc-400">
        Loading payment requests...
      </div>
    );
  }

  if (requests.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 pt-2">
      {/* Real-time Notification Banner */}
      {notification && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center justify-between animate-in fade-in slide-in-from-top-1 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : notification.type === "warning"
              ? "bg-amber-50 text-amber-800 border border-amber-200"
              : "bg-blue-50 text-blue-800 border border-blue-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <Eye className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-semibold">{notification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            className="text-[10px] font-bold text-zinc-500 hover:text-black cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
          Payment Requests ({requests.length})
        </span>
        <span className="text-[10px] text-zinc-500 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Live SSE Sync</span>
        </span>
      </div>

      <div className="space-y-2">
        {requests.map((req) => {
          const isPending = req.status === "PENDING" || req.status === "SENT";
          const isViewed = req.status === "VIEWED";
          const isPaid = req.status === "PAID";
          const isCancelled = req.status === "CANCELLED";
          const isActionable = (isPending || isViewed) && !isPaid && !isCancelled;

          return (
            <div
              key={req.id}
              className={`p-3.5 rounded-2xl border transition-all text-xs space-y-2 ${
                isPaid
                  ? "bg-emerald-50/40 border-emerald-200"
                  : isViewed
                  ? "bg-purple-50/40 border-purple-200"
                  : isCancelled
                  ? "bg-zinc-50 border-zinc-200 opacity-60"
                  : "bg-white border-zinc-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-black text-sm text-[#1E1E1E]">
                    {formatPesewas(req.amountPesewas)}
                  </span>
                  <StatusBadge status={req.status} />
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleCopy(req)}
                    title="Copy payment link"
                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer flex items-center gap-1 text-[11px]"
                  >
                    {copiedId === req.id ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Link</span>
                      </>
                    )}
                  </button>

                  <a
                    href={req.payUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Open customer payment page"
                    className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-100 text-zinc-600 cursor-pointer"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Message if present */}
              {req.message && (
                <p className="text-[11px] text-zinc-600 italic bg-zinc-50 p-2 rounded-xl border border-zinc-100">
                  &ldquo;{req.message}&rdquo;
                </p>
              )}

              {/* Push MoMo indicator */}
              {req.pushMomo && (
                <div className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  <span>MoMo Prompt Pushed ({req.momoProvider || "Mobile Money"})</span>
                </div>
              )}

              {/* Metadata & Timestamp */}
              <div className="flex items-center justify-between text-[10px] text-zinc-500 pt-1 border-t border-zinc-100">
                <div>
                  {isPaid && req.paidAt ? (
                    <span className="text-emerald-700 font-semibold">
                      Paid on {new Date(req.paidAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : isViewed && req.viewedAt ? (
                    <span className="text-purple-700 font-semibold">
                      Viewed on {new Date(req.viewedAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  ) : (
                    <span>
                      Expires {new Date(req.expiresAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>

                {/* Staff Actions */}
                {isActionable && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => handleResend(req.id)}
                      className="text-zinc-600 hover:text-black font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>Resend</span>
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => handleCancel(req.id)}
                      className="text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-0.5 cursor-pointer"
                    >
                      <Ban className="w-2.5 h-2.5" />
                      <span>Cancel</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: PaymentRequestStatus }) {
  switch (status) {
    case "SENT":
      return (
        <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center gap-1">
          <Send className="w-2.5 h-2.5" />
          <span>Sent</span>
        </span>
      );
    case "VIEWED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold text-[10px] flex items-center gap-1 animate-pulse">
          <Eye className="w-2.5 h-2.5" />
          <span>Viewed</span>
        </span>
      );
    case "PAID":
      return (
        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
          <CheckCircle2 className="w-2.5 h-2.5" />
          <span>Paid</span>
        </span>
      );
    case "FAILED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px] flex items-center gap-1">
          <XCircle className="w-2.5 h-2.5" />
          <span>Failed</span>
        </span>
      );
    case "EXPIRED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px] flex items-center gap-1">
          <Clock className="w-2.5 h-2.5" />
          <span>Expired</span>
        </span>
      );
    case "CANCELLED":
      return (
        <span className="px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600 font-bold text-[10px] flex items-center gap-1">
          <Ban className="w-2.5 h-2.5" />
          <span>Cancelled</span>
        </span>
      );
    default:
      return (
        <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700 font-bold text-[10px]">
          {status}
        </span>
      );
  }
}
