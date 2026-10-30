import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, AppError } from "@/lib/api-response";
import { sendSms } from "@/lib/sms";
import { formatPesewas } from "@/lib/money";
import { sendResendEmail } from "@/lib/email/resend";
import { buildAppointmentReminderEmail } from "@/lib/email/templates";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function POST(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.PAYMENTS_REQUEST);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        items: { include: { service: true } },
        staff: { include: { user: true } },
      },
    });

    if (!booking || booking.deletedAt) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    const pendingPesewas = booking.totalPesewas - booking.amountPaidPesewas;
    const serviceName = booking.items[0]?.service.name || "beauty appointment";

    // Dispatch SMS reminder via gateway
    const message = `Hello ${booking.customer.name}, friendly reminder from Becca's Crown Beauty Vault for your ${serviceName}. Please complete your pending payment of ${formatPesewas(pendingPesewas)} to secure your slot. Reference: ${booking.reference}.`;
    await sendSms({
      recipient: booking.customer.phone,
      message,
    });

    let emailSent = false;
    if (booking.customer.email) {
      try {
        const dateFormatted = booking.startUtc
          ? booking.startUtc.toLocaleDateString("en-GB", {
              timeZone: "Africa/Accra",
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })
          : "Upcoming Date";
        const timeFormatted = booking.startUtc
          ? booking.startUtc.toLocaleTimeString("en-GB", {
              timeZone: "Africa/Accra",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            })
          : "Scheduled Time";

        const { subject, html, text } = buildAppointmentReminderEmail({
          customerName: booking.customer.name,
          serviceName,
          dateFormatted,
          timeFormatted,
          reference: booking.reference,
          staffName: booking.staff?.user?.name,
          amountDue: formatPesewas(pendingPesewas),
          manageUrl: `${env.APP_URL}/manage/${booking.reference}`,
        });

        const res = await sendResendEmail({
          to: booking.customer.email,
          subject,
          html,
          text,
        });
        emailSent = res.success;
      } catch (emailErr) {
        logger.warn(`Failed to dispatch reminder email for ${booking.reference}`, {
          error: emailErr,
        });
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "PAYMENT_REMINDER_SENT",
        entityType: "Booking",
        entityId: bookingId,
        newValues: {
          customerPhone: booking.customer.phone,
          customerEmail: booking.customer.email || null,
          emailSent,
          amountPending: pendingPesewas,
        },
      },
    });

    const channels = emailSent
      ? `SMS (${booking.customer.phone}) and Email (${booking.customer.email})`
      : `SMS (${booking.customer.phone})`;

    return successResponse({
      id: booking.id,
      customerPhone: booking.customer.phone,
      customerEmail: booking.customer.email,
      emailSent,
      message: `Reminder sent to ${booking.customer.name} via ${channels} successfully.`,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return errorResponse(err.message, err.code, err.statusCode, err.details);
    }
    throw err;
  }
}
