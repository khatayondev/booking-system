import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { normalizeGhanaPhone } from "@/lib/sms";

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || "";

    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { phone: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
            deletedAt: null,
          }
        : { deletedAt: null },
      take: 20,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        notes: true,
      },
    });

    return successResponse({ customers });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const body = await req.json();
    const { name, phone, email, notes } = body;

    if (!name?.trim()) {
      return errorResponse("Customer name is required", "VALIDATION_ERROR", 400);
    }

    if (!phone?.trim()) {
      return errorResponse("Customer phone is required", "VALIDATION_ERROR", 400);
    }

    const normPhone = normalizeGhanaPhone(phone.trim());

    // Check if customer already exists by phone
    const existing = await prisma.customer.findUnique({
      where: { phone: normPhone },
    });

    if (existing) {
      // Update name/email if provided
      const updated = await prisma.customer.update({
        where: { id: existing.id },
        data: {
          name: name.trim() || existing.name,
          email: email?.trim() || existing.email,
          notes: notes?.trim() || existing.notes,
        },
      });
      return successResponse({ customer: updated, isExisting: true });
    }

    const customer = await prisma.customer.create({
      data: {
        name: name.trim(),
        phone: normPhone,
        email: email?.trim() || null,
        notes: notes?.trim() || null,
      },
    });

    return successResponse({ customer, isExisting: false }, "Customer created", 201);
  } catch (error) {
    return handleRouteError(error);
  }
}
