import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError, AppError } from "@/lib/api-response";

const createAddonSchema = z.object({
  name: z.string().min(2, "Add-on name is required"),
  durationMin: z.number().int().min(0, "Extra duration cannot be negative").default(0),
  pricePesewas: z.number().int().min(0, "Extra price cannot be negative"),
  active: z.boolean().default(true),
});

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }
    requirePermission(session, PERMISSION_KEYS.SERVICES_MANAGE);

    const { id: serviceId } = await props.params;

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service || service.deletedAt) {
      throw new AppError("Service not found", 404, "NOT_FOUND");
    }

    const body = await req.json();
    const parsed = createAddonSchema.parse(body);

    const addon = await prisma.serviceAddon.create({
      data: {
        serviceId,
        name: parsed.name.trim(),
        durationMin: parsed.durationMin,
        pricePesewas: parsed.pricePesewas,
        active: parsed.active,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "ADDON_CREATE",
        entityType: "SERVICE_ADDON",
        entityId: addon.id,
        newValues: addon,
      },
    });

    return successResponse(addon, "Add-on created successfully", 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
