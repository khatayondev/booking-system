import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { can, requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { emitBookingEvent } from "@/lib/booking-events";
import { z } from "zod";

const addNoteSchema = z.object({
  note: z.string().min(1, "Note content cannot be empty"),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.BOOKINGS_EDIT);

    const body = await req.json();
    const { note } = addNoteSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    const canManageAll = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL);
    if (!canManageAll && booking.staffId !== session.staffId) {
      return errorResponse(
        "Forbidden: You can only add notes to appointments assigned to you.",
        "FORBIDDEN",
        403
      );
    }

    const now = new Date();
    const formattedNote = `[${now.toISOString().split("T")[0]} ${now.toLocaleTimeString("en-GB", { timeZone: "Africa/Accra", hour: "2-digit", minute: "2-digit" })}] ${note.trim()} (by ${session.name})`;
    const updatedNotes = booking.notes ? `${booking.notes}\n${formattedNote}` : formattedNote;

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id: bookingId },
        data: { notes: updatedNotes },
      });

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "BOOKING_NOTE_ADDED",
          entityType: "BOOKING",
          entityId: bookingId,
          newValues: {
            note,
            author: session.name,
            role: session.role,
          },
        },
      });
    });

    emitBookingEvent({
      type: "NOTE_ADDED",
      bookingId: booking.id,
      reference: booking.reference,
      staffId: booking.staffId,
      timestamp: now.toISOString(),
    });

    return successResponse({
      notes: updatedNotes,
      message: "Internal note added successfully",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
