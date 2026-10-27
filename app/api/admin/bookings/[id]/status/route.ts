import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { can, requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { assertBookingTransition } from "@/lib/payments/state-machine";
import { emitBookingEvent } from "@/lib/booking-events";
import { sendSms } from "@/lib/sms";
import { BookingStatusType } from "@/lib/payments/types";
import { BookingStatus } from "@prisma/client";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELLED", "NO_SHOW"]),
  reason: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const parsed = updateStatusSchema.parse(body);
    const targetStatus = parsed.status as BookingStatusType;

    // Check permissions
    if (targetStatus === "CANCELLED") {
      requirePermission(session, PERMISSION_KEYS.BOOKINGS_CANCEL);
      if (!parsed.reason || parsed.reason.trim().length === 0) {
        return errorResponse("Cancellation reason is required", "BAD_REQUEST", 400);
      }
    } else {
      requirePermission(session, PERMISSION_KEYS.BOOKINGS_EDIT);
    }

    // Fetch booking
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        customer: true,
        staff: true,
      },
    });

    if (!booking) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    // Scoped permissions check for Staff role
    const canManageAll = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL);
    if (!canManageAll && booking.staffId !== session.staffId) {
      return errorResponse(
        "Forbidden: You can only manage appointments assigned to you.",
        "FORBIDDEN",
        403
      );
    }

    // Validate transition with state machine
    assertBookingTransition(booking.status as BookingStatusType, targetStatus);

    const oldStatus = booking.status;
    const now = new Date();

    // Prepare internal notes update if reason provided
    let updatedNotes = booking.notes || "";
    if (parsed.reason) {
      const reasonStamp = `[${now.toISOString().split("T")[0]} ${targetStatus}] ${parsed.reason} (by ${session.name})`;
      updatedNotes = updatedNotes ? `${updatedNotes}\n${reasonStamp}` : reasonStamp;
    }

    // Execute atomic update and audit log
    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: targetStatus as BookingStatus,
          notes: updatedNotes,
        },
      });

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: `BOOKING_STATUS_${targetStatus}`,
          entityType: "BOOKING",
          entityId: bookingId,
          oldValues: { status: oldStatus },
          newValues: {
            status: targetStatus,
            reference: booking.reference,
            reason: parsed.reason || null,
            updatedBy: session.name,
            userRole: session.role,
          },
        },
      });
    });

    // Real-time SSE broadcast
    emitBookingEvent({
      type: "STATUS_CHANGED",
      bookingId: booking.id,
      reference: booking.reference,
      status: targetStatus,
      staffId: booking.staffId,
      timestamp: now.toISOString(),
    });

    // Send customer notification via SMS
    try {
      if (targetStatus === "CONFIRMED") {
        await sendSms({
          recipient: booking.customer.phone,
          message: `Aura Studio: Your appointment (${booking.reference}) has been confirmed! We look forward to seeing you.`,
        });
      } else if (targetStatus === "CANCELLED") {
        await sendSms({
          recipient: booking.customer.phone,
          message: `Aura Studio: Your appointment (${booking.reference}) has been cancelled. Reason: ${parsed.reason || "Client request"}. Contact us if you need to rebook.`,
        });
      }
    } catch (smsErr) {
      console.warn("SMS notification dispatch error", smsErr);
    }

    return successResponse({
      id: booking.id,
      reference: booking.reference,
      oldStatus,
      newStatus: targetStatus,
      message: `Booking status updated to ${targetStatus} successfully`,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
