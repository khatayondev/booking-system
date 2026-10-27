import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError, AppError } from "@/lib/api-response";

const updateCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters").optional(),
  description: z.string().nullable().optional(),
  order: z.number().int().optional(),
});

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }
    requirePermission(session, PERMISSION_KEYS.SERVICES_MANAGE);

    const { id } = await props.params;
    const body = await req.json();
    const parsed = updateCategorySchema.parse(body);

    const existing = await prisma.serviceCategory.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError("Category not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.serviceCategory.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
        ...(parsed.description !== undefined ? { description: parsed.description } : {}),
        ...(parsed.order !== undefined ? { order: parsed.order } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CATEGORY_UPDATE",
        entityType: "SERVICE_CATEGORY",
        entityId: id,
        oldValues: existing,
        newValues: updated,
      },
    });

    return successResponse(updated, "Category updated successfully");
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }
    requirePermission(session, PERMISSION_KEYS.SERVICES_MANAGE);

    const { id } = await props.params;

    const existing = await prisma.serviceCategory.findUnique({
      where: { id },
      include: {
        services: { where: { deletedAt: null } },
      },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError("Category not found", 404, "NOT_FOUND");
    }

    if (existing.services.length > 0) {
      throw new AppError(
        `Cannot delete category "${existing.name}" because it still contains ${existing.services.length} active service(s). Please move or delete the services first.`,
        400,
        "CATEGORY_HAS_SERVICES"
      );
    }

    const deleted = await prisma.serviceCategory.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CATEGORY_DELETE",
        entityType: "SERVICE_CATEGORY",
        entityId: id,
        oldValues: existing,
      },
    });

    return successResponse(deleted, "Category deleted successfully");
  } catch (err) {
    return handleRouteError(err);
  }
}
