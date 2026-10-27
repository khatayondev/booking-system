import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError, AppError } from "@/lib/api-response";

const updateAddonSchema = z.object({
  name: z.string().min(2).optional(),
  durationMin: z.number().int().min(0).optional(),
  pricePesewas: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
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
    const parsed = updateAddonSchema.parse(body);

    const existing = await prisma.serviceAddon.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Add-on not found", 404, "NOT_FOUND");
    }

    const updated = await prisma.serviceAddon.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
        ...(parsed.durationMin !== undefined ? { durationMin: parsed.durationMin } : {}),
        ...(parsed.pricePesewas !== undefined ? { pricePesewas: parsed.pricePesewas } : {}),
        ...(parsed.active !== undefined ? { active: parsed.active } : {}),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "ADDON_UPDATE",
        entityType: "SERVICE_ADDON",
        entityId: id,
        oldValues: existing,
        newValues: updated,
      },
    });

    return successResponse(updated, "Add-on updated successfully");
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

    const existing = await prisma.serviceAddon.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new AppError("Add-on not found", 404, "NOT_FOUND");
    }

    await prisma.serviceAddon.delete({
      where: { id },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "ADDON_DELETE",
        entityType: "SERVICE_ADDON",
        entityId: id,
        oldValues: existing,
      },
    });

    return successResponse({ id }, "Add-on deleted successfully");
  } catch (err) {
    return handleRouteError(err);
  }
}
