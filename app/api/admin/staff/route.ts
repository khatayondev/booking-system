import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { z } from "zod";
import { validateShiftsDoNotOverlap } from "@/lib/staff-schedule";

const createStaffSchema = z.object({
  name: z.string().min(2, "Staff name is required"),
  phone: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  photoUrl: z.string().url("Must be a valid photo URL").optional().or(z.literal("")),
  specialties: z.array(z.string()).default([]),
  userId: z.string().uuid("Invalid user ID").optional().or(z.literal("")),
  serviceIds: z.array(z.string()).default([]),
  schedules: z
    .array(
      z.object({
        weekday: z.number().int().min(0).max(6),
        startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time"),
        endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time"),
        breakStart: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal("")),
        breakEnd: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/).optional().or(z.literal("")),
        label: z.string().optional().or(z.literal("")),
        isDayOff: z.boolean().default(false),
        active: z.boolean().default(true),
      })
    )
    .optional(),
});

export async function GET() {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    // List all non-deleted staff with their schedules, services, upcoming time-offs and blocked times
    const staffList = await prisma.staff.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
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
        timeOffs: {
          orderBy: { startUtc: "desc" },
          take: 20,
        },
        blockedTimes: {
          orderBy: { startUtc: "desc" },
          take: 20,
        },
      },
    });

    // Also fetch all active services and users available for assignment
    const allServices = await prisma.service.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, name: true, durationMin: true, pricePesewas: true, categoryId: true },
      orderBy: { name: "asc" },
    });

    const allUsers = await prisma.user.findMany({
      where: { deletedAt: null, active: true },
      select: { id: true, name: true, email: true, phone: true, role: { select: { name: true } } },
      orderBy: { name: "asc" },
    });

    return successResponse({
      staff: staffList,
      services: allServices,
      users: allUsers,
      currentUserRole: session.role,
    });
  } catch (err) {
    return handleRouteError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    requirePermission(session, PERMISSION_KEYS.STAFF_MANAGE);

    const body = await req.json();
    const parsed = createStaffSchema.parse(body);

    // Validate shifts if provided
    if (parsed.schedules && parsed.schedules.length > 0) {
      validateShiftsDoNotOverlap(parsed.schedules);
    }

    // Check if userId is already linked to another staff
    if (parsed.userId) {
      const existingWithUser = await prisma.staff.findFirst({
        where: { userId: parsed.userId, deletedAt: null },
      });
      if (existingWithUser) {
        return errorResponse(
          "Selected user is already linked to another staff profile",
          "USER_ALREADY_LINKED",
          400
        );
      }
    }

    const created = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          name: parsed.name,
          phone: parsed.phone || null,
          bio: parsed.bio || null,
          photoUrl: parsed.photoUrl || null,
          specialties: parsed.specialties,
          userId: parsed.userId || null,
        },
      });

      // Assign services
      if (parsed.serviceIds && parsed.serviceIds.length > 0) {
        await tx.staffService.createMany({
          data: parsed.serviceIds.map((serviceId) => ({
            staffId: staff.id,
            serviceId,
          })),
          skipDuplicates: true,
        });
      }

      // Create shifts if provided, else create standard Mon-Sat 09:00-18:00
      if (parsed.schedules && parsed.schedules.length > 0) {
        await tx.staffSchedule.createMany({
          data: parsed.schedules.map((s) => ({
            staffId: staff.id,
            weekday: s.weekday,
            startTime: s.startTime,
            endTime: s.endTime,
            breakStart: s.breakStart || null,
            breakEnd: s.breakEnd || null,
            label: s.label || null,
            isDayOff: s.isDayOff || false,
            active: s.active !== false,
          })),
        });
      } else {
        // Default schedules Mon to Sat 09:00-18:00
        const defaultSchedules = [1, 2, 3, 4, 5, 6].map((weekday) => ({
          staffId: staff.id,
          weekday,
          startTime: "09:00",
          endTime: "18:00",
          breakStart: "13:00",
          breakEnd: "14:00",
          label: "Regular Shift",
          isDayOff: false,
          active: true,
        }));
        await tx.staffSchedule.createMany({ data: defaultSchedules });
      }

      const userRecord = await tx.user.findUnique({ where: { id: session.userId } });

      await tx.auditLog.create({
        data: {
          userId: userRecord ? userRecord.id : null,
          action: "STAFF_CREATE",
          entityType: "STAFF",
          entityId: staff.id,
          newValues: {
            name: staff.name,
            specialties: staff.specialties,
            serviceCount: parsed.serviceIds.length,
            createdBy: session.email,
            userRole: session.role,
          },
        },
      });

      return staff;
    });

    return successResponse(created, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
