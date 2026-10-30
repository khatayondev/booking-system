import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS, can } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, AppError } from "@/lib/api-response";
import { sendResendEmail } from "@/lib/email/resend";
import { buildPostServiceReviewEmail } from "@/lib/email/templates";
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

    requirePermission(session, PERMISSION_KEYS.BOOKINGS_EDIT);

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

    // Scoped check: if user only has bookings.view_own, check staffId match
    if (!can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL)) {
      if (session.staffId && booking.staffId !== session.staffId) {
        return errorResponse("Forbidden: You cannot edit appointments for other staff members.", "FORBIDDEN", 403);
      }
    }

    const nextStatus = booking.status === "COMPLETED" ? "CONFIRMED" : "COMPLETED";

    const updated = await prisma.$transaction(async (tx) => {
      const b = await tx.booking.update({
        where: { id: bookingId },
        data: { status: nextStatus },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "BOOKING_STATUS_TOGGLED",
          entityType: "Booking",
          entityId: bookingId,
          oldValues: { status: booking.status },
          newValues: { status: nextStatus },
        },
      });

      return b;
    });

    // If marked as COMPLETED and customer has email, send thank you & review request
    if (nextStatus === "COMPLETED" && booking.customer?.email) {
      try {
        const serviceName = booking.items[0]?.service.name || "Crown Beauty Treatment";
        const staffName = booking.staff?.user?.name;
        const { subject, html, text } = buildPostServiceReviewEmail({
          customerName: booking.customer.name,
          serviceName,
          staffName,
          reviewUrl: `${env.APP_URL}/review`,
          rebookUrl: `${env.APP_URL}/book`,
        });

        await sendResendEmail({
          to: booking.customer.email,
          subject,
          html,
          text,
        });

        logger.info(`Post-service thank you email sent to ${booking.customer.email} for booking ${booking.reference}`);
      } catch (err) {
        logger.warn(`Failed to dispatch post-service review email for ${booking.reference}`, { error: err });
      }
    }

    return successResponse({
      id: updated.id,
      status: updated.status,
      completed: updated.status === "COMPLETED",
      message: `Appointment marked as ${updated.status}.`,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return errorResponse(err.message, err.code, err.statusCode, err.details);
    }
    throw err;
  }
}
