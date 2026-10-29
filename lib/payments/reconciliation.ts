import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendSms } from "@/lib/sms";
import { formatPesewas } from "@/lib/money";
import { AppError } from "@/lib/api-response";
import { emitBookingEvent } from "@/lib/booking-events";
import { VerifyPaymentResult, PaymentStatusType, BookingStatusType } from "./types";
import {
  assertPaymentTransition,
  assertCanConfirmBooking,
  assertBookingTransition,
} from "./state-machine";

export interface ReconcileOptions {
  reference: string;
  providerResult: VerifyPaymentResult;
  source: "WEBHOOK" | "RETURN_URL" | "JOB" | "POS";
  auditUserId?: string;
}

export interface ReconcileResult {
  success: boolean;
  alreadyProcessed: boolean;
  paymentId: string;
  bookingId?: string | null;
  paymentStatus: PaymentStatusType;
  bookingStatus?: BookingStatusType;
  amountPaidPesewas: number;
  message: string;
}

/**
 * Reconciles a Paystack transaction with row-level locking.
 * Guarantees that concurrent webhooks and return-page verifications do NOT race.
 */
export async function reconcilePaymentTransaction(
  options: ReconcileOptions
): Promise<ReconcileResult> {
  const { reference, providerResult, source, auditUserId } = options;

  return await prisma.$transaction(async (tx) => {
    // 1. Acquire row-level lock on Payment record
    const lockedPayments = await tx.$queryRaw<
      Array<{
        id: string;
        reference: string;
        status: PaymentStatusType;
        bookingId: string | null;
        amountPesewas: number;
        currency: string;
      }>
    >`SELECT id, reference, status, "bookingId", "amountPesewas", currency FROM "Payment" WHERE reference = ${reference} FOR UPDATE`;

    if (!lockedPayments || lockedPayments.length === 0) {
      throw new AppError(
        `Payment record with reference "${reference}" not found`,
        404,
        "PAYMENT_NOT_FOUND"
      );
    }

    const payment = lockedPayments[0];

    // 2. Idempotency Check: if already PAID, return immediately
    if (payment.status === "PAID") {
      logger.info(
        `[Reconcile:${source}] Payment ${reference} is already PAID. Skipping re-processing.`
      );
      return {
        success: true,
        alreadyProcessed: true,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        paymentStatus: payment.status,
        amountPaidPesewas: payment.amountPesewas,
        message: "Payment already settled",
      };
    }

    // 3. Handle Provider Status
    if (providerResult.status === "success") {
      assertPaymentTransition(payment.status, "PAID");

      // Verify currency matches
      if (providerResult.currency.toUpperCase() !== "GHS") {
        throw new AppError(
          `Payment currency mismatch: expected GHS, got ${providerResult.currency}`,
          400,
          "CURRENCY_MISMATCH"
        );
      }

      // Update Payment to PAID
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "PAID",
          channel: providerResult.channel.toUpperCase() || "MOBILE_MONEY",
          paidAt: providerResult.paidAt ? new Date(providerResult.paidAt) : new Date(),
          providerReference: providerResult.reference,
        },
      });

      let updatedBookingStatus: BookingStatusType | undefined;
      let customerPhone: string | undefined;
      let bookingReference: string | undefined;

      // 4. Update associated Booking if attached
      if (payment.bookingId) {
        const lockedBookings = await tx.$queryRaw<
          Array<{
            id: string;
            reference: string;
            status: BookingStatusType;
            totalPesewas: number;
            depositRequiredPesewas: number;
            amountPaidPesewas: number;
            customerId: string;
          }>
        >`SELECT id, reference, status, "totalPesewas", "depositRequiredPesewas", "amountPaidPesewas", "customerId" FROM "Booking" WHERE id = ${payment.bookingId} FOR UPDATE`;

        if (lockedBookings && lockedBookings.length > 0) {
          const booking = lockedBookings[0];
          bookingReference = booking.reference;

          // Check deposit requirement
          assertCanConfirmBooking(
            booking,
            payment.amountPesewas,
            providerResult.currency
          );

          const newAmountPaid = booking.amountPaidPesewas + payment.amountPesewas;
          let nextBookingStatus = booking.status;

          // If pending payment and deposit satisfied, promote to CONFIRMED
          if (
            booking.status === "PENDING_PAYMENT" &&
            newAmountPaid >= booking.depositRequiredPesewas
          ) {
            assertBookingTransition(booking.status, "CONFIRMED");
            nextBookingStatus = "CONFIRMED";
          }

          await tx.booking.update({
            where: { id: booking.id },
            data: {
              amountPaidPesewas: newAmountPaid,
              status: nextBookingStatus,
            },
          });

          updatedBookingStatus = nextBookingStatus;

          // Fetch customer for confirmation SMS
          const customer = await tx.customer.findUnique({
            where: { id: booking.customerId },
          });
          if (customer?.phone) {
            customerPhone = customer.phone;
          }
        }
      }

      // 5. Release any active hold for this reference/booking
      await tx.slotHold.deleteMany({
        where: { token: reference },
      });

      // 6. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: auditUserId || null,
          action: "PAYMENT_SETTLED",
          entityType: "Payment",
          entityId: payment.id,
          newValues: {
            reference,
            amountPesewas: payment.amountPesewas,
            status: "PAID",
            source,
            bookingStatus: updatedBookingStatus,
          },
        },
      });

      // 7. Dispatch SMS Confirmation
      if (customerPhone && bookingReference && updatedBookingStatus === "CONFIRMED") {
        try {
          await sendSms({
            recipient: customerPhone,
            message: `Becca's Crown Beauty Vault: Your booking (${bookingReference}) has been confirmed! Payment received: ${formatPesewas(
              payment.amountPesewas
            )}. We look forward to welcoming you to our East Legon studio.`,
          });
        } catch (smsErr) {
          logger.warn(`Failed to dispatch confirmation SMS for ${bookingReference}`, {
            error: smsErr,
          });
        }
      }

      if (payment.bookingId && bookingReference) {
        emitBookingEvent({
          type: "STATUS_CHANGED",
          bookingId: payment.bookingId,
          reference: bookingReference,
          status: updatedBookingStatus,
          timestamp: new Date().toISOString(),
        });
      }

      return {
        success: true,
        alreadyProcessed: false,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        paymentStatus: "PAID",
        bookingStatus: updatedBookingStatus,
        amountPaidPesewas: payment.amountPesewas,
        message: "Payment successfully reconciled and booking updated",
      };
    } else {
      // Failed payment
      assertPaymentTransition(payment.status, "FAILED");

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
        },
      });

      await tx.auditLog.create({
        data: {
          userId: auditUserId || null,
          action: "PAYMENT_FAILED",
          entityType: "Payment",
          entityId: payment.id,
          newValues: {
            reference,
            status: "FAILED",
            source,
            gatewayResponse: providerResult.gatewayResponse,
          },
        },
      });

      return {
        success: false,
        alreadyProcessed: false,
        paymentId: payment.id,
        bookingId: payment.bookingId,
        paymentStatus: "FAILED",
        amountPaidPesewas: 0,
        message: providerResult.gatewayResponse || "Payment failed or was abandoned",
      };
    }
  });
}
