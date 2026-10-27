import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, AppError } from "@/lib/api-response";
import { sendSms } from "@/lib/sms";
import { formatPesewas } from "@/lib/money";

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
      },
    });

    if (!booking || booking.deletedAt) {
      return errorResponse("Booking not found", "NOT_FOUND", 404);
    }

    const pendingPesewas = booking.totalPesewas - booking.amountPaidPesewas;
    const serviceName = booking.items[0]?.service.name || "beauty appointment";

    // Dispatch SMS reminder via gateway
    const message = `Hello ${booking.customer.name}, friendly reminder from Aura Studio for your ${serviceName}. Please complete your pending payment of ${formatPesewas(pendingPesewas)} to secure your slot. Reference: ${booking.reference}.`;
    await sendSms({
      recipient: booking.customer.phone,
      message,
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "PAYMENT_REMINDER_SENT",
        entityType: "Booking",
        entityId: bookingId,
        newValues: {
          customerPhone: booking.customer.phone,
          amountPending: pendingPesewas,
        },
      },
    });

    return successResponse({
      id: booking.id,
      customerPhone: booking.customer.phone,
      message: `Reminder sent to ${booking.customer.name} (${booking.customer.phone}) successfully.`,
    });
  } catch (err: unknown) {
    if (err instanceof AppError) {
      return errorResponse(err.message, err.code, err.statusCode, err.details);
    }
    throw err;
  }
}
