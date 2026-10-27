import { getCurrentSession } from "@/lib/auth";
import { can, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";
import { formatTime } from "@/lib/date";

export const GET = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  const hasViewAll = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL);
  const hasViewOwn = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_OWN);

  if (!hasViewAll && !hasViewOwn) {
    return errorResponse("Forbidden: Insufficient permissions to search appointments", "FORBIDDEN", 403);
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";

  if (!query || query.length < 2) {
    return successResponse({ results: [] });
  }

  const staffFilter = !hasViewAll && session.staffId ? { staffId: session.staffId } : {};

  // Search bookings by reference, customer name, customer phone, notes
  const bookings = await prisma.booking.findMany({
    where: {
      ...staffFilter,
      deletedAt: null,
      OR: [
        { reference: { contains: query, mode: "insensitive" } },
        { customer: { name: { contains: query, mode: "insensitive" } } },
        { customer: { phone: { contains: query, mode: "insensitive" } } },
        { notes: { contains: query, mode: "insensitive" } },
      ],
    },
    include: {
      customer: true,
      staff: true,
      items: { include: { service: true } },
    },
    take: 8,
    orderBy: { startUtc: "desc" },
  });

  const formatted = bookings.map((b) => ({
    id: b.id,
    type: "booking",
    reference: b.reference,
    title: b.customer.name,
    subtitle: `${b.items[0]?.service.name || "Appointment"} • ${formatTime(b.startUtc)}`,
    phone: b.customer.phone,
    status: b.status,
    totalPesewas: b.totalPesewas,
    staffName: b.staff.name,
  }));

  return successResponse({ results: formatted });
});
