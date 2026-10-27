import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { can, requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { emitBookingEvent } from "@/lib/booking-events";
import { calculateDeposit } from "@/lib/money";
import { z } from "zod";

const updateItemsSchema = z.object({
  serviceIds: z.array(z.string().uuid("Invalid service ID")).min(1, "At least one service is required"),
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

    requirePermission(session, PERMISSION_KEYS.BOOKINGS_EDIT);

    const body = await req.json();
    const { serviceIds } = updateItemsSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { items: true },
    });

    if (!booking) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    const canManageAll = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL);
    if (!canManageAll && booking.staffId !== session.staffId) {
      return errorResponse(
        "Forbidden: You can only edit appointments assigned to you.",
        "FORBIDDEN",
        403
      );
    }

    // Fetch the new services
    const services = await prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        active: true,
        deletedAt: null,
      },
    });

    if (services.length !== serviceIds.length) {
      return errorResponse("One or more selected services are invalid or inactive", "BAD_REQUEST", 400);
    }

    // Recalculate totals
    let newSubtotalPesewas = 0;
    let newDepositRequiredPesewas = 0;

    for (const service of services) {
      newSubtotalPesewas += service.pricePesewas;
      const deposit = calculateDeposit(
        service.pricePesewas,
        service.depositType,
        service.depositValue
      );
      newDepositRequiredPesewas += deposit;
    }

    const newTotalPesewas = Math.max(0, newSubtotalPesewas - booking.discountPesewas);

    // Update in transaction: delete old items, insert new items, update booking totals
    await prisma.$transaction(async (tx) => {
      await tx.bookingItem.deleteMany({
        where: { bookingId },
      });

      for (const service of services) {
        await tx.bookingItem.create({
          data: {
            bookingId,
            serviceId: service.id,
            pricePesewas: service.pricePesewas,
            durationMin: service.durationMin,
          },
        });
      }

      await tx.booking.update({
        where: { id: bookingId },
        data: {
          subtotalPesewas: newSubtotalPesewas,
          totalPesewas: newTotalPesewas,
          depositRequiredPesewas: newDepositRequiredPesewas,
        },
      });

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "BOOKING_ITEMS_UPDATED",
          entityType: "BOOKING",
          entityId: bookingId,
          oldValues: {
            subtotalPesewas: booking.subtotalPesewas,
            totalPesewas: booking.totalPesewas,
            itemCount: booking.items.length,
          },
          newValues: {
            subtotalPesewas: newSubtotalPesewas,
            totalPesewas: newTotalPesewas,
            services: services.map((s) => s.name),
            updatedBy: session.name,
          },
        },
      });
    });

    emitBookingEvent({
      type: "UPDATED",
      bookingId: booking.id,
      reference: booking.reference,
      staffId: booking.staffId,
      timestamp: new Date().toISOString(),
    });

    return successResponse({
      id: booking.id,
      subtotalPesewas: newSubtotalPesewas,
      totalPesewas: newTotalPesewas,
      depositRequiredPesewas: newDepositRequiredPesewas,
      message: "Booking items updated successfully",
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
