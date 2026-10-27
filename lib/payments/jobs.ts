import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { releaseAbandonedHolds } from "@/lib/availability/holds";
import { getPaymentProvider } from "./provider";
import { reconcilePaymentTransaction } from "./reconciliation";
import { assertBookingTransition } from "./state-machine";
import { BookingStatusType } from "./types";

export interface MaintenanceJobResult {
  expiredHoldsCount: number;
  cancelledBookingsCount: number;
  reconciledPaymentsCount: number;
  mismatchesDetected: number;
  details: string[];
}

/**
 * Scheduled background maintenance jobs:
 * 1. Expire abandoned slot holds.
 * 2. Cancel unpaid PENDING_PAYMENT bookings after N minutes.
 * 3. Reconcile PENDING payments older than 15 minutes via Paystack verify and alert on mismatches.
 */
export async function runPaymentMaintenanceJobs(options: {
  unpaidBookingThresholdMin?: number;
  stalePaymentThresholdMin?: number;
} = {}): Promise<MaintenanceJobResult> {
  const { unpaidBookingThresholdMin = 15, stalePaymentThresholdMin = 15 } = options;
  const now = new Date();
  const details: string[] = [];

  // Job 1: Expire abandoned slot holds
  const expiredHoldsCount = await releaseAbandonedHolds(now);
  if (expiredHoldsCount > 0) {
    details.push(`Released ${expiredHoldsCount} abandoned slot holds.`);
  }

  // Job 2: Cancel unpaid pending bookings after N minutes
  const unpaidCutoff = new Date(now.getTime() - unpaidBookingThresholdMin * 60 * 1000);
  const unpaidBookings = await prisma.booking.findMany({
    where: {
      status: "PENDING_PAYMENT",
      amountPaidPesewas: 0,
      createdAt: { lt: unpaidCutoff },
      deletedAt: null,
    },
    select: { id: true, reference: true, status: true },
  });

  let cancelledBookingsCount = 0;
  for (const b of unpaidBookings) {
    try {
      assertBookingTransition(b.status as BookingStatusType, "CANCELLED");
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: b.id },
          data: { status: "CANCELLED" },
        });

        await tx.auditLog.create({
          data: {
            action: "BOOKING_AUTO_CANCELLED_UNPAID",
            entityType: "Booking",
            entityId: b.id,
            newValues: {
              reference: b.reference,
              reason: `Unpaid after ${unpaidBookingThresholdMin} minutes`,
            },
          },
        });
      });
      cancelledBookingsCount++;
    } catch (err) {
      logger.error(`Failed to auto-cancel booking ${b.reference}`, { error: err });
    }
  }

  if (cancelledBookingsCount > 0) {
    details.push(`Auto-cancelled ${cancelledBookingsCount} unpaid pending bookings.`);
  }

  // Job 3: Reconcile PENDING payments older than 15 minutes through Paystack verify
  const stalePaymentCutoff = new Date(now.getTime() - stalePaymentThresholdMin * 60 * 1000);
  const stalePayments = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      createdAt: { lt: stalePaymentCutoff },
    },
    include: { booking: true },
  });

  let reconciledPaymentsCount = 0;
  let mismatchesDetected = 0;
  const provider = getPaymentProvider();

  for (const p of stalePayments) {
    try {
      const verifyResult = await provider.verify(p.reference);

      // Check for amount or currency mismatch
      if (verifyResult.status === "success") {
        if (
          verifyResult.amountPesewas !== p.amountPesewas ||
          verifyResult.currency.toUpperCase() !== "GHS"
        ) {
          mismatchesDetected++;
          const alertMsg = `MISMATCH ALERT: Payment ${p.reference} has discrepancy. DB expected ${p.amountPesewas} GHS, Paystack reports ${verifyResult.amountPesewas} ${verifyResult.currency}`;
          logger.error(alertMsg);

          await prisma.auditLog.create({
            data: {
              action: "PAYMENT_MISMATCH_ALERT",
              entityType: "Payment",
              entityId: p.id,
              newValues: {
                reference: p.reference,
                expectedAmount: p.amountPesewas,
                receivedAmount: verifyResult.amountPesewas,
                currency: verifyResult.currency,
              },
            },
          });
          details.push(alertMsg);
          continue;
        }

        // Reconcile valid success
        await reconcilePaymentTransaction({
          reference: p.reference,
          providerResult: verifyResult,
          source: "JOB",
        });
        reconciledPaymentsCount++;
        details.push(`Reconciled successful payment ${p.reference} from Paystack.`);
      } else if (verifyResult.status === "failed" || verifyResult.status === "abandoned") {
        // Mark failed
        await prisma.payment.update({
          where: { id: p.id },
          data: { status: "FAILED" },
        });
        details.push(`Marked stale payment ${p.reference} as FAILED (${verifyResult.status}).`);
      }
    } catch (err) {
      logger.error(`Error reconciling stale payment ${p.reference}`, { error: err });
    }
  }

  return {
    expiredHoldsCount,
    cancelledBookingsCount,
    reconciledPaymentsCount,
    mismatchesDetected,
    details,
  };
}
