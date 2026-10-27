import { prisma } from "@/lib/db";
import { successResponse, handleRouteError } from "@/lib/api-response";

/**
 * Public catalog endpoint for customer booking flow and services showcase.
 * Returns only active, non-deleted categories, services, addons, and stylists.
 * No authentication required.
 */
export async function GET() {
  try {
    const categories = await prisma.serviceCategory.findMany({
      where: { deletedAt: null },
      orderBy: { order: "asc" },
      include: {
        services: {
          where: { deletedAt: null, active: true },
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
                    bio: true,
                    photoUrl: true,
                    specialties: true,
                    active: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const staffMembers = await prisma.staff.findMany({
      where: { active: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        bio: true,
        photoUrl: true,
        specialties: true,
        staffServices: {
          select: {
            serviceId: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return successResponse({
      categories,
      staffMembers,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
