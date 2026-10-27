import { getCurrentSession } from "@/lib/auth";
import { errorResponse, successResponse, withErrorHandler } from "@/lib/api-response";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/rbac";

export const GET = withErrorHandler(async (req: Request) => {
  const session = await getCurrentSession();
  if (!session) {
    return errorResponse("Authentication required", "UNAUTHORIZED", 401);
  }

  if (session.role !== ROLES.OWNER_ADMIN && session.role !== ROLES.MANAGER) {
    return errorResponse("Forbidden: Manager access required", "FORBIDDEN", 403);
  }

  const { searchParams } = new URL(req.url);
  const bookingId = searchParams.get("bookingId");
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") || 50), 100);

  const where: Record<string, unknown> = {};
  if (bookingId) where.bookingId = bookingId;
  if (channel) where.channel = channel.toUpperCase();
  if (status) where.status = status.toUpperCase();

  const [logs, total] = await Promise.all([
    prisma.messageLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    }),
    prisma.messageLog.count({ where }),
  ]);

  return successResponse({
    logs,
    total,
  });
});
