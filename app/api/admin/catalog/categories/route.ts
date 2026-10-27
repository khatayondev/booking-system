import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getCurrentSession } from "@/lib/auth";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";

const createCategorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
  description: z.string().optional(),
  order: z.number().int().default(0),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }
    requirePermission(session, PERMISSION_KEYS.SERVICES_MANAGE);

    const body = await req.json();
    const parsed = createCategorySchema.parse(body);

    const baseSlug = parsed.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

    const category = await prisma.serviceCategory.create({
      data: {
        name: parsed.name.trim(),
        slug,
        description: parsed.description?.trim() || null,
        order: parsed.order,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CATEGORY_CREATE",
        entityType: "SERVICE_CATEGORY",
        entityId: category.id,
        newValues: category,
      },
    });

    return successResponse(category, "Category created successfully", 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
