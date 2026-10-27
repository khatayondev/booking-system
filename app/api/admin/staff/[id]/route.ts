import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { z } from "zod";

const updateStaffSchema = z.object({
  name: z.string().min(2, "Staff name is required").optional(),
  phone: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  photoUrl: z.string().url("Must be a valid photo URL").optional().or(z.literal("")),
  specialties: z.array(z.string()).optional(),
  userId: z.string().uuid("Invalid user ID").optional().or(z.literal("")).nullable(),
  active: z.boolean().optional(),
  serviceIds: z.array(z.string()).optional(),
});

export async function GET(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        staffServices: {
          include: {
            service: { select: { id: true, name: true, pricePesewas: true, durationMin: true } },
          },
        },
        schedules: {
          where: { active: true },
          orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
        },
        timeOffs: { orderBy: { startUtc: "desc" }, take: 10 },
        blockedTimes: { orderBy: { startUtc: "desc" }, take: 10 },
      },
    });

    if (!staff || staff.deletedAt) {
      return errorResponse("Staff member not found", "NOT_FOUND", 404);
    }

    return successResponse(staff);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.STAFF_MANAGE);

    const body = await req.json();
    const parsed = updateStaffSchema.parse(body);

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return errorResponse("Staff member not found", "NOT_FOUND", 404);
    }

    // Check if new userId is already assigned to someone else
    if (parsed.userId && parsed.userId !== existing.userId) {
      const alreadyLinked = await prisma.staff.findFirst({
        where: { userId: parsed.userId, id: { not: id }, deletedAt: null },
      });
      if (alreadyLinked) {
        return errorResponse("Selected user is already linked to another staff profile", "USER_ALREADY_LINKED", 400);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.update({
        where: { id },
        data: {
          name: parsed.name ?? existing.name,
          phone: parsed.phone !== undefined ? (parsed.phone || null) : existing.phone,
          bio: parsed.bio !== undefined ? (parsed.bio || null) : existing.bio,
          photoUrl: parsed.photoUrl !== undefined ? (parsed.photoUrl || null) : existing.photoUrl,
          specialties: parsed.specialties ?? existing.specialties,
          userId: parsed.userId !== undefined ? (parsed.userId || null) : existing.userId,
          active: parsed.active ?? existing.active,
        },
      });

      // Update service assignments if provided
      if (parsed.serviceIds) {
        await tx.staffService.deleteMany({ where: { staffId: id } });
        if (parsed.serviceIds.length > 0) {
          await tx.staffService.createMany({
            data: parsed.serviceIds.map((serviceId) => ({
              staffId: id,
              serviceId,
            })),
            skipDuplicates: true,
          });
        }
      }

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "STAFF_UPDATE",
          entityType: "STAFF",
          entityId: id,
          newValues: {
            name: staff.name,
            updatedFields: Object.keys(body),
            updatedBy: session.email,
            userRole: session.role,
          },
        },
      });

      return staff;
    });

    return successResponse(updated);
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function DELETE(
  _req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.STAFF_MANAGE);

    const existing = await prisma.staff.findUnique({ where: { id } });
    if (!existing || existing.deletedAt) {
      return errorResponse("Staff member not found", "NOT_FOUND", 404);
    }

    await prisma.$transaction(async (tx) => {
      // Soft-delete
      await tx.staff.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          active: false,
        },
      });

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "STAFF_DELETE",
          entityType: "STAFF",
          entityId: id,
          newValues: {
            name: existing.name,
            deletedBy: session.email,
            userRole: session.role,
          },
        },
      });
    });

    return successResponse({ deleted: true, id });
  } catch (err) {
    return handleRouteError(err);
  }
}
