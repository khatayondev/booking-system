import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    // Fetch categories ordered by order asc, including non-deleted services with addons and staff
    const categories = await prisma.serviceCategory.findMany({
      where: { deletedAt: null },
      orderBy: { order: "asc" },
      include: {
        services: {
          where: { deletedAt: null },
          orderBy: { order: "asc" },
          include: {
            addons: {
              where: { active: true },
              orderBy: { createdAt: "asc" },
            },
            staffServices: {
              include: {
                staff: {
                  select: {
                    id: true,
                    name: true,
                    phone: true,
                    bio: true,
                    active: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Fetch all active staff for assignment options
    const staffMembers = await prisma.staff.findMany({
      where: { active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        phone: true,
        bio: true,
      },
      orderBy: { name: "asc" },
    });

    return successResponse({
      categories,
      staffMembers,
      userRole: session.role,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
