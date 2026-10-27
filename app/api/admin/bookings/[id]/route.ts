import { getCurrentSession } from "@/lib/auth";
import { can, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, handleRouteError } from "@/lib/api-response";

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        staff: true,
        customer: true,
        items: {
          include: {
            service: true,
          },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!booking) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    // Scoped authorization check:
    const canViewAll = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL);
    const canViewOwn = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_OWN, { staffId: booking.staffId });

    if (!canViewAll && !canViewOwn) {
      return errorResponse(
        "Forbidden: You do not have permission to view bookings for other staff members.",
        "FORBIDDEN",
        403
      );
    }

    // Fetch customer's total completed visits count
    const customerVisitsCount = await prisma.booking.count({
      where: {
        customerId: booking.customerId,
        status: "COMPLETED",
        deletedAt: null,
      },
    });

    // Fetch audit trail for this booking
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entityType: "BOOKING",
        entityId: booking.id,
      },
      include: {
        user: {
          select: { name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const formattedAuditTrail = auditLogs.map((log) => ({
      id: log.id,
      action: log.action,
      performedBy: log.user?.name || log.user?.email || "System Automated",
      details: log.newValues,
      createdAt: log.createdAt.toISOString(),
    }));

    return successResponse({
      booking: {
        id: booking.id,
        reference: booking.reference,
        status: booking.status,
        source: booking.source,
        startUtc: booking.startUtc.toISOString(),
        endUtc: booking.endUtc.toISOString(),
        subtotalPesewas: booking.subtotalPesewas,
        discountPesewas: booking.discountPesewas,
        totalPesewas: booking.totalPesewas,
        depositRequiredPesewas: booking.depositRequiredPesewas,
        amountPaidPesewas: booking.amountPaidPesewas,
        balanceDuePesewas: Math.max(0, booking.totalPesewas - booking.amountPaidPesewas),
        notes: booking.notes,
        createdAt: booking.createdAt.toISOString(),
        updatedAt: booking.updatedAt.toISOString(),
        customer: {
          id: booking.customer.id,
          name: booking.customer.name,
          phone: booking.customer.phone,
          email: booking.customer.email,
          notes: booking.customer.notes,
          allergies: booking.customer.allergies,
          preferences: booking.customer.preferences,
          tags: booking.customer.tags,
          marketingConsent: booking.customer.marketingConsent,
          completedVisits: customerVisitsCount,
        },
        staff: {
          id: booking.staff.id,
          name: booking.staff.name,
          phone: booking.staff.phone,
          photoUrl: booking.staff.photoUrl,
          specialties: booking.staff.specialties,
        },
        items: booking.items.map((i) => ({
          id: i.id,
          serviceId: i.serviceId,
          name: i.service.name,
          pricePesewas: i.pricePesewas,
          durationMin: i.durationMin,
          bufferMin: i.service.bufferMin,
        })),
        payments: booking.payments.map((p) => ({
          id: p.id,
          reference: p.reference,
          status: p.status,
          amountPesewas: p.amountPesewas,
          channel: p.channel,
          createdAt: p.createdAt.toISOString(),
        })),
        auditTrail: formattedAuditTrail,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
