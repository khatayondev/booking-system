import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      order: z.number().int(),
    })
  ),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }
    requirePermission(session, PERMISSION_KEYS.SERVICES_MANAGE);

    const body = await req.json();
    const { items } = reorderSchema.parse(body);

    await prisma.$transaction(
      items.map((item) =>
        prisma.serviceCategory.update({
          where: { id: item.id },
          data: { order: item.order },
        })
      )
    );

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CATEGORIES_REORDER",
        entityType: "SERVICE_CATEGORY",
        newValues: items,
      },
    });

    return successResponse({ count: items.length }, "Categories reordered successfully");
  } catch (err) {
    return handleRouteError(err);
  }
}
