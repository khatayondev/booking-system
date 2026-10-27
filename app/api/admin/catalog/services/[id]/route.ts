import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError, AppError } from "@/lib/api-response";
import { DepositType } from "@prisma/client";

const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  categoryId: z.string().uuid().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  durationMin: z.number().int().min(5).optional(),
  bufferMin: z.number().int().min(0).optional(),
  pricePesewas: z.number().int().min(100).optional(),
  depositType: z.enum(["NONE", "FULL", "PERCENTAGE", "FIXED"]).optional(),
  depositValue: z.number().int().min(0).optional(),
  active: z.boolean().optional(),
  order: z.number().int().optional(),
  staffIds: z.array(z.string().uuid()).optional(),
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
    const parsed = updateServiceSchema.parse(body);

    const existing = await prisma.service.findUnique({
      where: { id },
      include: {
        staffServices: true,
      },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError("Service not found", 404, "NOT_FOUND");
    }

    const price = parsed.pricePesewas ?? existing.pricePesewas;
    const depType = parsed.depositType ?? existing.depositType;
    const depVal = parsed.depositValue ?? existing.depositValue;

    if (depType === "PERCENTAGE" && depVal > 100) {
      throw new AppError("Deposit percentage cannot exceed 100%", 400, "INVALID_DEPOSIT_VALUE");
    }
    if (depType === "FIXED" && depVal > price) {
      throw new AppError("Fixed deposit cannot exceed the service price", 400, "INVALID_DEPOSIT_VALUE");
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (parsed.staffIds !== undefined) {
        await tx.staffService.deleteMany({
          where: { serviceId: id },
        });

        if (parsed.staffIds.length > 0) {
          await tx.staffService.createMany({
            data: parsed.staffIds.map((staffId) => ({
              serviceId: id,
              staffId,
            })),
          });
        }
      }

      const svc = await tx.service.update({
        where: { id },
        data: {
          ...(parsed.name !== undefined ? { name: parsed.name.trim() } : {}),
          ...(parsed.categoryId !== undefined ? { categoryId: parsed.categoryId } : {}),
          ...(parsed.description !== undefined ? { description: parsed.description } : {}),
          ...(parsed.imageUrl !== undefined ? { imageUrl: parsed.imageUrl } : {}),
          ...(parsed.durationMin !== undefined ? { durationMin: parsed.durationMin } : {}),
          ...(parsed.bufferMin !== undefined ? { bufferMin: parsed.bufferMin } : {}),
          ...(parsed.pricePesewas !== undefined ? { pricePesewas: parsed.pricePesewas } : {}),
          ...(parsed.depositType !== undefined ? { depositType: parsed.depositType as DepositType } : {}),
          ...(parsed.depositValue !== undefined ? { depositValue: parsed.depositValue } : {}),
          ...(parsed.active !== undefined ? { active: parsed.active } : {}),
          ...(parsed.order !== undefined ? { order: parsed.order } : {}),
        },
        include: {
          addons: { where: { active: true } },
          staffServices: { include: { staff: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          userId: session.userId,
          action: "SERVICE_UPDATE",
          entityType: "SERVICE",
          entityId: id,
          oldValues: {
            name: existing.name,
            pricePesewas: existing.pricePesewas,
            active: existing.active,
          },
          newValues: {
            name: svc.name,
            pricePesewas: svc.pricePesewas,
            active: svc.active,
          },
        },
      });

      return svc;
    });

    return successResponse(updated, "Service updated successfully");
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

    const existing = await prisma.service.findUnique({
      where: { id },
    });

    if (!existing || existing.deletedAt) {
      throw new AppError("Service not found", 404, "NOT_FOUND");
    }

    const deleted = await prisma.service.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        active: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "SERVICE_DELETE",
        entityType: "SERVICE",
        entityId: id,
        oldValues: existing,
      },
    });

    return successResponse(deleted, "Service deleted successfully");
  } catch (err) {
    return handleRouteError(err);
  }
}
