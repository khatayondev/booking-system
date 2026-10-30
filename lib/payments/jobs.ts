import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { releaseAbandonedHolds } from "@/lib/availability/holds";
import { getPaymentProvider } from "./provider";
import { reconcilePaymentTransaction } from "./reconciliation";
import { assertBookingTransition } from "./state-machine";
import { BookingStatusType } from "./types";
import { sendResendEmail } from "@/lib/email/resend";
import { buildAppointmentReminderEmail } from "@/lib/email/templates";
import { formatPesewas } from "@/lib/money";
import { env } from "@/lib/env";

export interface MaintenanceJobResult {
  expiredHoldsCount: number;
  cancelledBookingsCount: number;
  reconciledPaymentsCount: number;
  mismatchesDetected: number;
  remindersSentCount: number;
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

  // Job 4: Automated 24-hour appointment reminders
  let remindersSentCount = 0;
  try {
    const reminderWindowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const reminderWindowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingBookings = await prisma.booking.findMany({
      where: {
        status: "CONFIRMED",
        deletedAt: null,
        startUtc: {
          gte: reminderWindowStart,
          lte: reminderWindowEnd,
        },
      },
      include: {
        customer: true,
        items: { include: { service: true } },
        staff: { include: { user: true } },
      },
    });

    for (const b of upcomingBookings) {
      if (!b.customer?.email) continue;

      // Check if reminder was already sent
      const alreadySent = await prisma.auditLog.findFirst({
        where: {
          action: "APPOINTMENT_REMINDER_SENT",
          entityId: b.id,
        },
      });

      if (alreadySent) continue;

      const pendingPesewas = Math.max(0, b.totalPesewas - b.amountPaidPesewas);
      const serviceName = b.items[0]?.service.name || "beauty treatment";

      const dateFormatted = b.startUtc
        ? b.startUtc.toLocaleDateString("en-GB", {
            timeZone: "Africa/Accra",
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "Tomorrow";
      const timeFormatted = b.startUtc
        ? b.startUtc.toLocaleTimeString("en-GB", {
            timeZone: "Africa/Accra",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          })
        : "Scheduled Time";

      const { subject, html, text } = buildAppointmentReminderEmail({
        customerName: b.customer.name,
        serviceName,
        dateFormatted,
        timeFormatted,
        reference: b.reference,
        staffName: b.staff?.user?.name,
        amountDue: formatPesewas(pendingPesewas),
        manageUrl: `${env.APP_URL}/manage/${b.reference}`,
      });

      const res = await sendResendEmail({
        to: b.customer.email,
        subject,
        html,
        text,
      });

      if (res.success) {
        remindersSentCount++;
        await prisma.auditLog.create({
          data: {
            action: "APPOINTMENT_REMINDER_SENT",
            entityType: "Booking",
            entityId: b.id,
            newValues: {
              reference: b.reference,
              recipient: b.customer.email,
              serviceName,
            },
          },
        });
      }
    }

    if (remindersSentCount > 0) {
      details.push(`Sent ${remindersSentCount} automated 24-hour reminder email(s).`);
    }
  } catch (err) {
    logger.error("Error running automated appointment reminders job", { error: err });
  }

  return {
    expiredHoldsCount,
    cancelledBookingsCount,
    reconciledPaymentsCount,
    mismatchesDetected,
    remindersSentCount,
    details,
  };
}
