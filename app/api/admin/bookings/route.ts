import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { can, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { BookingStatus, BookingSource, PaymentStatus, Prisma } from "@prisma/client";


export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const canViewAll = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_ALL);
    const canViewOwn = can(session, PERMISSION_KEYS.BOOKINGS_VIEW_OWN);

    if (!canViewAll && !canViewOwn) {
      return errorResponse(
        "Forbidden: Insufficient permissions to view bookings.",
        "FORBIDDEN",
        403
      );
    }

    const { searchParams } = new URL(req.url);
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const statusParam = searchParams.get("status");
    const staffIdParam = searchParams.get("staffId");
    const serviceIdParam = searchParams.get("serviceId");
    const sourceParam = searchParams.get("source");
    const paymentStatusParam = searchParams.get("paymentStatus");
    const searchParam = searchParams.get("search");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "25", 10)));
    const sort = searchParams.get("sort") || "startUtc:asc";

    // Build Prisma WhereInput
    const where: Prisma.BookingWhereInput = {
      deletedAt: null,
    };

    // Role-based staff scoping
    if (!canViewAll) {
      if (!session.staffId) {
        // Staff user without linked staff profile has no bookings to see
        return successResponse({
          bookings: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          stats: {
            total: 0,
            confirmed: 0,
            checkedIn: 0,
            completed: 0,
            cancelled: 0,
            pendingPayment: 0,
            noShow: 0,
          },
        });
      }
      where.staffId = session.staffId;
    } else if (staffIdParam && staffIdParam !== "ALL") {
      where.staffId = staffIdParam;
    }

    // Date range filter
    if (startDateParam || endDateParam) {
      where.startUtc = {};
      if (startDateParam) {
        where.startUtc.gte = new Date(startDateParam);
      }
      if (endDateParam) {
        where.startUtc.lte = new Date(endDateParam);
      }
    }

    // Status filter
    if (statusParam && statusParam !== "ALL") {
      if (Object.values(BookingStatus).includes(statusParam as BookingStatus)) {
        where.status = statusParam as BookingStatus;
      }
    }

    // Source filter
    if (sourceParam && sourceParam !== "ALL") {
      if (Object.values(BookingSource).includes(sourceParam as BookingSource)) {
        where.source = sourceParam as BookingSource;
      }
    }

    // Service filter (checks booking items)
    if (serviceIdParam && serviceIdParam !== "ALL") {
      where.items = {
        some: { serviceId: serviceIdParam },
      };
    }

    // Payment status filter
    if (paymentStatusParam && paymentStatusParam !== "ALL") {
      if (Object.values(PaymentStatus).includes(paymentStatusParam as PaymentStatus)) {
        where.payments = {
          some: { status: paymentStatusParam as PaymentStatus },
        };
      }
    }

    // Text search (Customer Name, Phone, Email, Booking Reference, Service Name, Notes)
    if (searchParam && searchParam.trim()) {
      const q = searchParam.trim();
      where.OR = [
        { reference: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { customer: { phone: { contains: q } } },
        { customer: { email: { contains: q, mode: "insensitive" } } },
        { items: { some: { service: { name: { contains: q, mode: "insensitive" } } } } },
        { notes: { contains: q, mode: "insensitive" } },
      ];
    }

    // Sorting
    let orderBy: Prisma.BookingOrderByWithRelationInput = { startUtc: "asc" };
    if (sort === "startUtc:desc") {
      orderBy = { startUtc: "desc" };
    } else if (sort === "createdAt:desc") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "createdAt:asc") {
      orderBy = { createdAt: "asc" };
    }

    // Query DB in parallel for data, total count, and summary stats
    const [bookings, total, statsGroup] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          staff: {
            select: { id: true, name: true, photoUrl: true, specialties: true },
          },
          items: {
            include: {
              service: {
                select: { id: true, name: true, durationMin: true, bufferMin: true },
              },
            },
          },
          payments: {
            select: {
              id: true,
              reference: true,
              status: true,
              amountPesewas: true,
              channel: true,
              createdAt: true,
            },
          },
        },
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.booking.count({ where }),
      prisma.booking.groupBy({
        by: ["status"],
        where: !canViewAll && session.staffId ? { staffId: session.staffId, deletedAt: null } : { deletedAt: null },
        _count: { id: true },
      }),
    ]);

    // Parse stats
    const stats = {
      total: 0,
      confirmed: 0,
      checkedIn: 0,
      completed: 0,
      cancelled: 0,
      pendingPayment: 0,
      noShow: 0,
    };

    for (const group of statsGroup) {
      const count = group._count?.id || 0;
      stats.total += count;
      if (group.status === "CONFIRMED") stats.confirmed = count;
      if (group.status === "CHECKED_IN") stats.checkedIn = count;
      if (group.status === "COMPLETED") stats.completed = count;
      if (group.status === "CANCELLED") stats.cancelled = count;
      if (group.status === "PENDING_PAYMENT") stats.pendingPayment = count;
      if (group.status === "NO_SHOW") stats.noShow = count;
    }

    const formattedBookings = bookings.map((b) => ({
      id: b.id,
      reference: b.reference,
      status: b.status,
      source: b.source,
      startUtc: b.startUtc.toISOString(),
      endUtc: b.endUtc.toISOString(),
      subtotalPesewas: b.subtotalPesewas,
      discountPesewas: b.discountPesewas,
      totalPesewas: b.totalPesewas,
      depositRequiredPesewas: b.depositRequiredPesewas,
      amountPaidPesewas: b.amountPaidPesewas,
      balanceDuePesewas: Math.max(0, b.totalPesewas - b.amountPaidPesewas),
      customer: b.customer,
      staff: b.staff,
      items: b.items.map((i) => ({
        id: i.id,
        serviceId: i.serviceId,
        name: i.service.name,
        pricePesewas: i.pricePesewas,
        durationMin: i.durationMin,
        bufferMin: i.service.bufferMin,
      })),
      payments: b.payments.map((p) => ({
        id: p.id,
        reference: p.reference,
        status: p.status,
        amountPesewas: p.amountPesewas,
        channel: p.channel,
        createdAt: p.createdAt.toISOString(),
      })),
      notes: b.notes,
      createdAt: b.createdAt.toISOString(),
    }));

    return successResponse({
      bookings: formattedBookings,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
