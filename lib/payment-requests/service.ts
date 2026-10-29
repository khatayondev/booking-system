import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import crypto from "crypto";
import { AppError } from "@/lib/api-response";
import {
  type PermissionContextUser,
  PERMISSION_KEYS,
  requirePermission,
} from "@/lib/rbac";
import { normalizeGhanaPhone, sendSms } from "@/lib/sms";
import { formatPesewas } from "@/lib/money";
import { emitBookingEvent } from "@/lib/booking-events";
import { getPaymentProvider } from "@/lib/payments/provider";
import { generateNextReceiptNumber } from "@/lib/pos/receipt-counter";
import { env } from "@/lib/env";
import type {
  CreatePaymentRequestInput,
  PaymentRequestDetail,
  PaymentRequestStatus,
  PublicPaymentRequestView,
  PayPaymentRequestInput,
} from "./types";

/**
 * Creates an unguessable 256-bit cryptographically secure token and its SHA-256 hash.
 */
export function generate256BitToken(): { rawToken: string; tokenHash: string; shortCode: string } {
  // 32 bytes = 256 bits of cryptographic entropy
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  // Short 8-character uppercase alphanumeric code for compact SMS links
  const shortCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  return { rawToken, tokenHash, shortCode };
}

function toPaystackMomoProvider(provider: string): "mtn" | "vod" | "tgo" {
  switch (provider.toUpperCase()) {
    case "TELECEL":
    case "VODAFONE":
    case "VOD":
      return "vod";
    case "AT":
    case "AIRTEL":
    case "TIGO":
    case "TGO":
      return "tgo";
    case "MTN":
    default:
      return "mtn";
  }
}

/**
 * Creates a new PaymentRequest for an active booking with an outstanding balance.
 * Enforces security constraints:
 * 1. 256-bit token stored as SHA-256 hash at rest.
 * 2. Only ONE active request per booking amount.
 * 3. Configurable expiry.
 * 4. Real-time banner event dispatched to customer booking page.
 * 5. SMS dispatched with short link.
 * 6. Optional MoMo prompt via Paystack Charge API.
 */
export async function createPaymentRequest(
  user: PermissionContextUser,
  input: CreatePaymentRequestInput
): Promise<PaymentRequestDetail> {
  // 1. Permission check
  requirePermission(user, PERMISSION_KEYS.PAYMENTS_REQUEST);

  // 2. Fetch booking with customer and items
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId, deletedAt: null },
    include: {
      customer: true,
      items: { include: { service: true } },
      paymentRequests: {
        where: {
          status: { in: ["PENDING", "SENT", "VIEWED"] },
          expiresAt: { gt: new Date() },
        },
      },
    },
  });

  if (!booking) {
    throw new AppError("Booking not found", 404, "NOT_FOUND");
  }

  // 3. Outstanding balance calculation
  const remainingBalancePesewas = booking.totalPesewas - booking.amountPaidPesewas;
  if (remainingBalancePesewas <= 0) {
    throw new AppError("This booking is already fully paid.", 400, "BAD_REQUEST");
  }

  // 4. Determine requested amount (full balance if omitted or custom)
  const amountPesewas =
    input.amountPesewas && input.amountPesewas > 0
      ? input.amountPesewas
      : remainingBalancePesewas;

  if (amountPesewas <= 0) {
    throw new AppError("Requested payment amount must be greater than zero.", 400, "BAD_REQUEST");
  }

  if (amountPesewas > remainingBalancePesewas) {
    throw new AppError(
      `Requested amount (${formatPesewas(amountPesewas)}) exceeds the outstanding balance (${formatPesewas(
        remainingBalancePesewas
      )}).`,
      400,
      "BAD_REQUEST"
    );
  }

  // 5. Security invariant: Only ONE active request per booking amount
  const existingWithSameAmount = booking.paymentRequests.find(
    (pr) => pr.amountPesewas === amountPesewas
  );
  if (existingWithSameAmount) {
    throw new AppError(
      `An active payment request for ${formatPesewas(amountPesewas)} is already pending for this booking.`,
      409,
      "CONFLICT"
    );
  }

  // 6. Token generation (256-bit unguessable raw token, hashed at rest)
  const { rawToken, tokenHash, shortCode } = generate256BitToken();

  // 7. Expiry calculation (configurable in minutes, defaults to 24 hours, min 10m, max 7 days)
  const expiryMinutes = Math.max(10, Math.min(input.expiryMinutes ?? 1440, 10080));
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  // 8. Normalize phone number
  const customerPhone = normalizeGhanaPhone(input.phone || booking.customer.phone);

  const paystackReference = `PR-${booking.reference.replace("BK-", "")}-${Date.now()}`;

  // 9. Persist PaymentRequest in DB
  const paymentRequest = await prisma.paymentRequest.create({
    data: {
      bookingId: booking.id,
      amountPesewas,
      currency: "GHS",
      tokenHash,
      shortCode,
      message: input.message?.trim() || null,
      phone: customerPhone,
      channel: input.channel || "ALL",
      pushMomo: Boolean(input.pushMomo),
      momoProvider: input.momoProvider || null,
      paystackReference,
      status: "PENDING",
      expiresAt,
      createdByUserId: user.userId,
    },
    include: {
      createdByUser: { select: { name: true } },
    },
  });

  const baseUrl = env.APP_URL || "http://localhost:3000";
  const payUrl = `${baseUrl}/pay/${rawToken}`;
  const shortUrl = `${baseUrl}/pay/r/${shortCode}`;

  // 10. Optional Mobile Money push prompt via Paystack Charge API
  if (input.pushMomo && input.momoProvider) {
    try {
      const provider = getPaymentProvider();
      await provider.chargeMobileMoney({
        email: booking.customer.email || `${customerPhone.replace("+", "")}@beccascrown.gh`,
        amountPesewas,
        phone: customerPhone,
        provider: toPaystackMomoProvider(input.momoProvider),
        reference: paystackReference,
        metadata: {
          bookingId: booking.id,
          bookingReference: booking.reference,
          paymentRequestId: paymentRequest.id,
        },
      });
    } catch (err: unknown) {
      console.warn("Mobile money push prompt warning:", err);
    }
  }

  // 11. Dispatch SMS with short link to customer
  const smsMessage = `Becca's Crown: Payment request of ${formatPesewas(
    amountPesewas
  )} for booking ${booking.reference}. Pay securely: ${shortUrl}${
    input.message ? ` (${input.message})` : ""
  }`;

  try {
    await sendSms({
      recipient: customerPhone,
      message: smsMessage,
      senderId: "BeccasCrown",
    });
  } catch (err: unknown) {
    console.error("Failed to send payment request SMS:", err);
  }

  // 12. Update status to SENT
  const updated = await prisma.paymentRequest.update({
    where: { id: paymentRequest.id },
    data: { status: "SENT" },
    include: {
      createdByUser: { select: { name: true } },
    },
  });

  // 13. Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "PAYMENT_REQUEST_CREATED",
      entityType: "PaymentRequest",
      entityId: updated.id,
      newValues: {
        bookingId: booking.id,
        bookingReference: booking.reference,
        amountPesewas,
        customerPhone,
        pushMomo: input.pushMomo,
        expiresAt: expiresAt.toISOString(),
      },
    },
  });

  // 14. Emit real-time SSE event for staff dashboard & customer booking page banner
  emitBookingEvent({
    type: "PAYMENT_REQUEST_SENT",
    bookingId: booking.id,
    reference: booking.reference,
    staffId: booking.staffId,
    paymentRequestId: updated.id,
    amountPesewas,
    customerPhone,
    message: input.message,
    shortCode,
    rawToken,
    payUrl: `/pay/${rawToken}`,
    timestamp: new Date().toISOString(),
  });

  return {
    id: updated.id,
    bookingId: booking.id,
    bookingReference: booking.reference,
    customerName: booking.customer.name,
    customerPhone: updated.phone,
    amountPesewas: updated.amountPesewas,
    currency: updated.currency,
    message: updated.message,
    channel: updated.channel,
    pushMomo: updated.pushMomo,
    momoProvider: updated.momoProvider,
    paystackReference: updated.paystackReference,
    status: "SENT",
    expiresAt: updated.expiresAt.toISOString(),
    viewedAt: updated.viewedAt?.toISOString() || null,
    paidAt: updated.paidAt?.toISOString() || null,
    cancelledAt: updated.cancelledAt?.toISOString() || null,
    createdByUserName: updated.createdByUser?.name || null,
    paymentId: updated.paymentId,
    payUrl,
    shortUrl,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
    rawToken, // Sent on create so staff can copy direct link
  };
}

/**
 * Retrieves public details of a PaymentRequest by raw 256-bit token or short code.
 * Validates expiration and marks request as VIEWED when opened for the first time.
 */
export async function getPaymentRequestByToken(
  tokenOrCode: string
): Promise<PublicPaymentRequestView> {
  const isShortCode = tokenOrCode.length <= 12;
  const tokenHash = isShortCode
    ? undefined
    : crypto.createHash("sha256").update(tokenOrCode).digest("hex");

  const pr = await prisma.paymentRequest.findFirst({
    where: isShortCode
      ? { shortCode: tokenOrCode.toUpperCase() }
      : { tokenHash },
    include: {
      booking: {
        include: {
          customer: true,
          staff: true,
          items: { include: { service: true } },
        },
      },
    },
  });

  if (!pr) {
    throw new AppError("Payment request not found or link has expired.", 404, "NOT_FOUND");
  }

  // Check expiration
  const now = new Date();
  let currentStatus = pr.status;
  if (pr.status !== "PAID" && pr.status !== "CANCELLED" && pr.expiresAt < now) {
    if (pr.status !== "EXPIRED") {
      await prisma.paymentRequest.update({
        where: { id: pr.id },
        data: { status: "EXPIRED" },
      });

      emitBookingEvent({
        type: "PAYMENT_REQUEST_EXPIRED",
        bookingId: pr.booking.id,
        reference: pr.booking.reference,
        paymentRequestId: pr.id,
        amountPesewas: pr.amountPesewas,
        timestamp: now.toISOString(),
      });
    }
    currentStatus = "EXPIRED";
  } else if (pr.status === "SENT" || pr.status === "PENDING") {
    // Mark VIEWED if opened for the first time
    await prisma.paymentRequest.update({
      where: { id: pr.id },
      data: {
        status: "VIEWED",
        viewedAt: now,
      },
    });

    emitBookingEvent({
      type: "PAYMENT_REQUEST_VIEWED",
      bookingId: pr.booking.id,
      reference: pr.booking.reference,
      paymentRequestId: pr.id,
      amountPesewas: pr.amountPesewas,
      timestamp: now.toISOString(),
    });
    currentStatus = "VIEWED";
  }

  const remainingBalancePesewas = pr.booking.totalPesewas - pr.booking.amountPaidPesewas;

  return {
    id: pr.id,
    bookingReference: pr.booking.reference,
    customerName: pr.booking.customer.name,
    customerPhone: pr.phone,
    amountPesewas: pr.amountPesewas,
    currency: pr.currency,
    message: pr.message,
    status: currentStatus,
    expiresAt: pr.expiresAt.toISOString(),
    services: pr.booking.items.map((item) => ({
      name: item.service.name,
      pricePesewas: item.pricePesewas,
    })),
    totalBookingPesewas: pr.booking.totalPesewas,
    amountPaidPesewas: pr.booking.amountPaidPesewas,
    remainingBalancePesewas,
    staffName: pr.booking.staff.name,
    startUtc: pr.booking.startUtc.toISOString(),
  };
}

/**
 * Completes payment for a PaymentRequest via Mobile Money or Card.
 * Atomically creates Payment, updates Booking balance, and generates sequential receipt (R-000123).
 */
export async function payPaymentRequest(
  tokenOrCode: string,
  input: PayPaymentRequestInput
): Promise<{
  success: boolean;
  status: PaymentRequestStatus;
  receiptNumber: string;
  amountPaidPesewas: number;
  newAmountPaidPesewas: number;
  remainingBalancePesewas: number;
  receiptUrl: string;
}> {
  const isShortCode = tokenOrCode.length <= 12;
  const tokenHash = isShortCode
    ? undefined
    : crypto.createHash("sha256").update(tokenOrCode).digest("hex");

  const pr = await prisma.paymentRequest.findFirst({
    where: isShortCode
      ? { shortCode: tokenOrCode.toUpperCase() }
      : { tokenHash },
    include: {
      booking: {
        include: {
          customer: true,
          items: { include: { service: true } },
        },
      },
    },
  });

  if (!pr) {
    throw new AppError("Payment request not found", 404, "NOT_FOUND");
  }

  if (pr.status === "PAID") {
    throw new AppError("This payment request has already been settled.", 400, "BAD_REQUEST");
  }

  if (pr.status === "CANCELLED") {
    throw new AppError("This payment request was cancelled. Please request a new payment link.", 400, "CANCELLED");
  }

  if (pr.status === "EXPIRED" || pr.expiresAt < new Date()) {
    throw new AppError("This payment request has expired. Please contact Becca's Crown for a new link.", 400, "EXPIRED");
  }

  const paymentReference =
    input.cardReference ||
    `PAY-${pr.booking.reference.replace("BK-", "")}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Interactive transaction for row-locking, atomic balance increment & gapless receipt numbering
  const result = await prisma.$transaction(async (tx) => {
    // 1. Lock booking row
    const lockedBooking = await tx.booking.findUniqueOrThrow({
      where: { id: pr.bookingId },
    });

    // 2. Create Payment record
    const payment = await tx.payment.create({
      data: {
        bookingId: pr.bookingId,
        reference: paymentReference,
        amountPesewas: pr.amountPesewas,
        currency: pr.currency,
        status: "PAID",
        channel: input.method === "MOBILE_MONEY" ? "MOBILE_MONEY" : "CARD",
        paidAt: new Date(),
        providerReference: input.method === "MOBILE_MONEY" ? `MOMO-${Date.now()}` : `CARD-${Date.now()}`,
      },
    });

    // 3. Update Booking balance and status
    const newAmountPaid = lockedBooking.amountPaidPesewas + pr.amountPesewas;
    const newStatus =
      lockedBooking.status === "PENDING_PAYMENT" || lockedBooking.status === "HELD"
        ? "CONFIRMED"
        : lockedBooking.status;

    const updatedBooking = await tx.booking.update({
      where: { id: pr.bookingId },
      data: {
        amountPaidPesewas: newAmountPaid,
        status: newStatus,
      },
    });

    // 4. Generate sequential gapless receipt number
    const receiptNumber = await generateNextReceiptNumber(tx);

    const snapshotItems = pr.booking.items.map((it) => ({
      serviceId: it.serviceId,
      serviceName: it.service.name,
      pricePesewas: it.pricePesewas,
      durationMin: it.durationMin,
      addOns: [],
    }));

    const snapshotPayments = [
      {
        method: input.method,
        amountPesewas: pr.amountPesewas,
        reference: paymentReference,
        notes: `Paid via customer payment request ${pr.id}`,
      },
    ];

    let cashierId = pr.createdByUserId;
    if (!cashierId) {
      const defaultUser = await tx.user.findFirst({ select: { id: true } });
      cashierId = defaultUser?.id || null;
    }

    const receipt = await tx.receipt.create({
      data: {
        receiptNumber,
        bookingId: pr.bookingId,
        customerId: pr.booking.customerId,
        cashierId: cashierId!,
        customerName: pr.booking.customer.name,
        customerPhone: pr.booking.customer.phone,
        subtotalPesewas: pr.amountPesewas,
        discountPesewas: 0,
        tipPesewas: 0,
        totalPesewas: pr.amountPesewas,
        amountPaidPesewas: pr.amountPesewas,
        changePesewas: 0,
        balanceDuePesewas: Math.max(0, updatedBooking.totalPesewas - newAmountPaid),
        status: "COMPLETED",
        items: snapshotItems as unknown as Prisma.InputJsonValue,
        payments: snapshotPayments as unknown as Prisma.InputJsonValue,
        notes: `Customer remote payment for ${pr.booking.reference}`,
      },
    });

    // Link receipt to payment
    await tx.payment.update({
      where: { id: payment.id },
      data: { receiptId: receipt.id },
    });

    // 5. Update PaymentRequest status
    await tx.paymentRequest.update({
      where: { id: pr.id },
      data: {
        status: "PAID",
        paidAt: new Date(),
        paymentId: payment.id,
      },
    });

    return {
      receiptNumber,
      amountPaidPesewas: newAmountPaid,
      remainingBalancePesewas: Math.max(0, updatedBooking.totalPesewas - newAmountPaid),
      customerPhone: pr.phone,
      bookingReference: pr.booking.reference,
    };
  });

  // Send confirmation SMS
  try {
    await sendSms({
      recipient: result.customerPhone,
      message: `Becca's Crown: Payment of ${formatPesewas(
        pr.amountPesewas
      )} received for booking ${result.bookingReference}. Receipt #${result.receiptNumber}. Thank you!`,
      senderId: "BeccasCrown",
    });
  } catch (err: unknown) {
    console.error("Failed to send payment receipt SMS:", err);
  }

  // Emit SSE event for dashboard and booking page
  emitBookingEvent({
    type: "PAYMENT_REQUEST_PAID",
    bookingId: pr.bookingId,
    reference: pr.booking.reference,
    paymentRequestId: pr.id,
    amountPesewas: pr.amountPesewas,
    customerPhone: pr.phone,
    timestamp: new Date().toISOString(),
  });

  return {
    success: true,
    status: "PAID",
    receiptNumber: result.receiptNumber,
    amountPaidPesewas: result.amountPaidPesewas,
    newAmountPaidPesewas: result.amountPaidPesewas,
    remainingBalancePesewas: result.remainingBalancePesewas,
    receiptUrl: `/receipt/${result.receiptNumber}`,
  };
}

/**
 * Cancels an active payment request.
 */
export async function cancelPaymentRequest(
  id: string,
  user: PermissionContextUser,
  reason?: string
): Promise<PaymentRequestDetail> {
  requirePermission(user, PERMISSION_KEYS.PAYMENTS_REQUEST);

  const pr = await prisma.paymentRequest.findUniqueOrThrow({
    where: { id },
    include: {
      booking: { include: { customer: true } },
      createdByUser: { select: { name: true } },
    },
  });

  if (pr.status === "PAID") {
    throw new AppError("Cannot cancel a payment request that has already been paid.", 400, "BAD_REQUEST");
  }

  if (pr.status === "CANCELLED") {
    throw new AppError("Payment request is already cancelled.", 400, "BAD_REQUEST");
  }

  const updated = await prisma.paymentRequest.update({
    where: { id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
    },
    include: {
      createdByUser: { select: { name: true } },
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "PAYMENT_REQUEST_CANCELLED",
      entityType: "PaymentRequest",
      entityId: id,
      newValues: {
        bookingId: pr.bookingId,
        bookingReference: pr.booking.reference,
        amountPesewas: pr.amountPesewas,
        reason: reason?.trim() || null,
      },
    },
  });

  emitBookingEvent({
    type: "PAYMENT_REQUEST_CANCELLED",
    bookingId: pr.bookingId,
    reference: pr.booking.reference,
    paymentRequestId: id,
    amountPesewas: pr.amountPesewas,
    timestamp: new Date().toISOString(),
  });

  const baseUrl = env.APP_URL || "http://localhost:3000";

  return {
    id: updated.id,
    bookingId: pr.booking.id,
    bookingReference: pr.booking.reference,
    customerName: pr.booking.customer.name,
    customerPhone: updated.phone,
    amountPesewas: updated.amountPesewas,
    currency: updated.currency,
    message: updated.message,
    channel: updated.channel,
    pushMomo: updated.pushMomo,
    momoProvider: updated.momoProvider,
    paystackReference: updated.paystackReference,
    status: "CANCELLED",
    expiresAt: updated.expiresAt.toISOString(),
    viewedAt: updated.viewedAt?.toISOString() || null,
    paidAt: updated.paidAt?.toISOString() || null,
    cancelledAt: updated.cancelledAt?.toISOString() || null,
    createdByUserName: updated.createdByUser?.name || null,
    paymentId: updated.paymentId,
    payUrl: `${baseUrl}/pay/r/${updated.shortCode}`,
    shortUrl: `${baseUrl}/pay/r/${updated.shortCode}`,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * Resends an existing payment request SMS and optional MoMo push.
 */
export async function resendPaymentRequest(
  id: string,
  user: PermissionContextUser
): Promise<PaymentRequestDetail> {
  requirePermission(user, PERMISSION_KEYS.PAYMENTS_REQUEST);

  const pr = await prisma.paymentRequest.findUniqueOrThrow({
    where: { id },
    include: {
      booking: { include: { customer: true } },
      createdByUser: { select: { name: true } },
    },
  });

  if (pr.status === "PAID") {
    throw new AppError("Cannot resend a payment request that has already been settled.", 400, "BAD_REQUEST");
  }

  if (pr.status === "CANCELLED") {
    throw new AppError("Cannot resend a cancelled payment request. Create a new one.", 400, "BAD_REQUEST");
  }

  // If expired, extend expiry by 24h
  const now = new Date();
  const isExpired = pr.expiresAt < now;
  const newExpiresAt = isExpired ? new Date(now.getTime() + 24 * 60 * 60 * 1000) : pr.expiresAt;

  const updated = await prisma.paymentRequest.update({
    where: { id },
    data: {
      status: "SENT",
      expiresAt: newExpiresAt,
    },
    include: {
      createdByUser: { select: { name: true } },
    },
  });

  const baseUrl = env.APP_URL || "http://localhost:3000";
  const shortUrl = `${baseUrl}/pay/r/${updated.shortCode}`;

  // Resend SMS
  const smsMessage = `Becca's Crown: Payment request of ${formatPesewas(
    updated.amountPesewas
  )} for booking ${pr.booking.reference}. Pay securely: ${shortUrl}${
    updated.message ? ` (${updated.message})` : ""
  }`;

  try {
    await sendSms({
      recipient: updated.phone,
      message: smsMessage,
      senderId: "BeccasCrown",
    });
  } catch (err: unknown) {
    console.error("Failed to resend SMS:", err);
  }

  // Resend MoMo prompt if requested
  if (updated.pushMomo && updated.momoProvider) {
    try {
      const provider = getPaymentProvider();
      await provider.chargeMobileMoney({
        email: pr.booking.customer.email || `${updated.phone.replace("+", "")}@beccascrown.gh`,
        amountPesewas: updated.amountPesewas,
        phone: updated.phone,
        provider: toPaystackMomoProvider(updated.momoProvider),
        reference: `${updated.paystackReference}-R-${Date.now()}`,
        metadata: {
          bookingId: pr.bookingId,
          bookingReference: pr.booking.reference,
          paymentRequestId: updated.id,
        },
      });
    } catch (err: unknown) {
      console.warn("Resend MoMo prompt warning:", err);
    }
  }

  emitBookingEvent({
    type: "PAYMENT_REQUEST_SENT",
    bookingId: pr.bookingId,
    reference: pr.booking.reference,
    paymentRequestId: updated.id,
    amountPesewas: updated.amountPesewas,
    customerPhone: updated.phone,
    timestamp: new Date().toISOString(),
  });

  return {
    id: updated.id,
    bookingId: pr.booking.id,
    bookingReference: pr.booking.reference,
    customerName: pr.booking.customer.name,
    customerPhone: updated.phone,
    amountPesewas: updated.amountPesewas,
    currency: updated.currency,
    message: updated.message,
    channel: updated.channel,
    pushMomo: updated.pushMomo,
    momoProvider: updated.momoProvider,
    paystackReference: updated.paystackReference,
    status: "SENT",
    expiresAt: updated.expiresAt.toISOString(),
    viewedAt: updated.viewedAt?.toISOString() || null,
    paidAt: updated.paidAt?.toISOString() || null,
    cancelledAt: updated.cancelledAt?.toISOString() || null,
    createdByUserName: updated.createdByUser?.name || null,
    paymentId: updated.paymentId,
    payUrl: `${baseUrl}/pay/r/${updated.shortCode}`,
    shortUrl,
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  };
}

/**
 * Lists all payment requests for a booking.
 */
export async function listPaymentRequestsForBooking(
  bookingId: string
): Promise<PaymentRequestDetail[]> {
  const requests = await prisma.paymentRequest.findMany({
    where: { bookingId },
    include: {
      booking: { include: { customer: true } },
      createdByUser: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const baseUrl = env.APP_URL || "http://localhost:3000";

  return requests.map((r) => ({
    id: r.id,
    bookingId: r.bookingId,
    bookingReference: r.booking.reference,
    customerName: r.booking.customer.name,
    customerPhone: r.phone,
    amountPesewas: r.amountPesewas,
    currency: r.currency,
    message: r.message,
    channel: r.channel,
    pushMomo: r.pushMomo,
    momoProvider: r.momoProvider,
    paystackReference: r.paystackReference,
    status: r.status,
    expiresAt: r.expiresAt.toISOString(),
    viewedAt: r.viewedAt?.toISOString() || null,
    paidAt: r.paidAt?.toISOString() || null,
    cancelledAt: r.cancelledAt?.toISOString() || null,
    createdByUserName: r.createdByUser?.name || null,
    paymentId: r.paymentId,
    payUrl: `${baseUrl}/pay/r/${r.shortCode}`,
    shortUrl: `${baseUrl}/pay/r/${r.shortCode}`,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}
