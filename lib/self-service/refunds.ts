import { prisma } from "../db";
import { AppError } from "../api-response";
import {
  requirePermission,
  PERMISSION_KEYS,
  PermissionContextUser,
} from "../rbac";
import { getPaymentProvider } from "../payments/provider";
import { notificationEvents } from "../notifications";
import { logger } from "../logger";

export interface ProcessRefundInput {
  bookingId: string;
  paymentId?: string;
  amountPesewas: number;
  refundType: "PAYSTACK" | "MANUAL";
  reason: string;
  user: PermissionContextUser;
}

export interface RefundResult {
  refundId: string;
  bookingId: string;
  paymentId: string;
  amountPesewas: number;
  status: string;
  refundType: "PAYSTACK" | "MANUAL";
  reason: string;
  remainingPaidPesewas: number;
}

/**
 * Executes a full or partial refund for a booking from the admin dashboard.
 * - Enforces role limits (Staff up to GH₵ 50, Manager up to GH₵ 500, Owner unlimited).
 * - Enforces mandatory non-empty reason string.
 * - Routes via Paystack API or records manual cash/momo refund.
 * - Updates Payment and Booking state atomically in a transaction.
 * - Dispatches customer notifications.
 */
export async function processDashboardRefund(
  input: ProcessRefundInput
): Promise<RefundResult> {
  const { bookingId, paymentId, amountPesewas, refundType, reason, user } = input;

  // 1. Validate reason is present and non-empty
  if (!reason || reason.trim().length === 0) {
    throw new AppError("A refund reason is required.", 400, "REFUND_REASON_REQUIRED");
  }

  // 2. Validate refund amount is positive integer
  if (!amountPesewas || amountPesewas <= 0 || !Number.isInteger(amountPesewas)) {
    throw new AppError("Refund amount must be a positive integer in pesewas.", 400, "INVALID_AMOUNT");
  }

  // 3. RBAC validation & role limit enforcement
  requirePermission(user, PERMISSION_KEYS.PAYMENTS_REFUND, { refundPesewas: amountPesewas });

  // 4. Fetch booking and associated payments
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      customer: true,
      items: { include: { service: true } },
      payments: {
        include: { refunds: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!booking) {
    throw new AppError("Booking not found.", 404, "NOT_FOUND");
  }

  if (booking.amountPaidPesewas <= 0) {
    throw new AppError("Booking has no paid amount available for refund.", 400, "NO_FUNDS_TO_REFUND");
  }

  if (amountPesewas > booking.amountPaidPesewas) {
    throw new AppError(
      `Requested refund amount (${amountPesewas} pesewas) exceeds the remaining paid amount on this booking (${booking.amountPaidPesewas} pesewas).`,
      400,
      "REFUND_EXCEEDS_BALANCE"
    );
  }

  // 5. Select target payment
  let targetPayment = paymentId
    ? booking.payments.find((p) => p.id === paymentId)
    : undefined;

  if (!targetPayment) {
    // Find first payment with available refundable balance
    targetPayment = booking.payments.find((p) => {
      if (p.status !== "PAID" && p.status !== "PARTIALLY_REFUNDED") return false;
      const totalRefundedOnPayment = p.refunds.reduce((acc, r) => acc + r.amountPesewas, 0);
      return p.amountPesewas - totalRefundedOnPayment >= amountPesewas;
    });
  }

  if (!targetPayment) {
    // Fallback: pick any PAID or PARTIALLY_REFUNDED payment
    targetPayment = booking.payments.find(
      (p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED"
    );
  }

  if (!targetPayment) {
    throw new AppError("No eligible successful payment record found to attach refund.", 400, "NO_ELIGIBLE_PAYMENT");
  }

  // 6. Execute Gateway Refund if PAYSTACK
  let providerRefundStatus = "COMPLETED";
  if (refundType === "PAYSTACK") {
    try {
      const provider = getPaymentProvider();
      const res = await provider.refund({
        reference: targetPayment.reference,
        amountPesewas,
        reason: reason.trim(),
      });
      providerRefundStatus = res.status === "processed" || res.status === "success" ? "COMPLETED" : res.status;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Paystack refund call failed";
      logger.error(`[Refund] Paystack refund failed: ${message}`);
      throw new AppError(`Paystack refund failed: ${message}`, 502, "GATEWAY_REFUND_FAILED");
    }
  }

  // 7. Atomic DB updates
  const { refund, updatedBooking } = await prisma.$transaction(async (tx) => {
    // Create refund record
    const createdRefund = await tx.refund.create({
      data: {
        paymentId: targetPayment.id,
        amountPesewas,
        reason: reason.trim(),
        status: providerRefundStatus,
        processedByUserId: user.userId,
      },
    });

    // Check total refunded on this payment
    const existingRefundsSum = targetPayment.refunds.reduce((acc, r) => acc + r.amountPesewas, 0);
    const newTotalRefunded = existingRefundsSum + amountPesewas;

    const newPaymentStatus =
      newTotalRefunded >= targetPayment.amountPesewas ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await tx.payment.update({
      where: { id: targetPayment.id },
      data: { status: newPaymentStatus },
    });

    // Update booking remaining amount paid
    const newAmountPaid = Math.max(0, booking.amountPaidPesewas - amountPesewas);
    const updated = await tx.booking.update({
      where: { id: booking.id },
      data: { amountPaidPesewas: newAmountPaid },
    });

    return { refund: createdRefund, updatedBooking: updated };
  });

  // 8. Dispatch notification event asynchronously
  const serviceName = booking.items[0]?.service?.name || "Beauty Service";
  notificationEvents
    .onRefundIssued(
      {
        id: booking.id,
        reference: booking.reference,
        startUtc: booking.startUtc,
        endUtc: booking.endUtc,
        serviceName,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone || undefined,
        customerEmail: booking.customer.email || undefined,
        totalPricePesewas: booking.totalPesewas,
        amountPaidPesewas: updatedBooking.amountPaidPesewas,
      },
      amountPesewas
    )
    .catch((err) => {
      logger.error(`[Refund] Failed to send refund notification: ${err}`);
    });

  return {
    refundId: refund.id,
    bookingId: booking.id,
    paymentId: targetPayment.id,
    amountPesewas,
    status: refund.status,
    refundType,
    reason: reason.trim(),
    remainingPaidPesewas: updatedBooking.amountPaidPesewas,
  };
}
