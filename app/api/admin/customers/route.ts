import { NextRequest } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { successResponse, errorResponse, handleRouteError } from "@/lib/api-response";
import { listCustomers } from "@/lib/customers/service";
import { prisma } from "@/lib/db";
import { normalizeGhanaPhone } from "@/lib/sms";
import { requirePermission, PERMISSION_KEYS } from "@/lib/rbac";
import { z } from "zod";

const createCustomerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(8, "Phone number is required"),
  email: z.string().email("Invalid email format").optional().nullable(),
  allergies: z.string().optional().nullable(),
  preferences: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  marketingConsent: z.boolean().optional().default(false),
  notes: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return errorResponse("Authentication required", "UNAUTHORIZED", 401);
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const tag = searchParams.get("tag") || undefined;
    const hasAllergies = searchParams.get("hasAllergies") === "true" ? true : undefined;
    const marketingConsent =
      searchParams.get("marketingConsent") === "true"
        ? true
        : searchParams.get("marketingConsent") === "false"
        ? false
        : undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "25", 10);

    const result = await listCustomers(
      { q, tag, hasAllergies, marketingConsent, page, limit },
      session
    );

    return successResponse(result);
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

    requirePermission(session, PERMISSION_KEYS.CUSTOMERS_EDIT);

    const body = await req.json();
    const parsed = createCustomerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid customer data", "BAD_REQUEST", 400, parsed.error.flatten());
    }

    const normPhone = normalizeGhanaPhone(parsed.data.phone);

    // Guard duplicate phone
    const existing = await prisma.customer.findUnique({
      where: { phone: normPhone },
    });
    if (existing && existing.deletedAt === null) {
      return errorResponse(
        `A customer with phone number ${normPhone} already exists.`,
        "PHONE_CONFLICT",
        409
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name: parsed.data.name.trim(),
        phone: normPhone,
        email: parsed.data.email?.trim() || null,
        allergies: parsed.data.allergies?.trim() || null,
        preferences: parsed.data.preferences?.trim() || null,
        tags: parsed.data.tags.map((t) => t.trim().toUpperCase()),
        marketingConsent: parsed.data.marketingConsent,
        marketingConsentAt: parsed.data.marketingConsent ? new Date() : null,
        notes: parsed.data.notes?.trim() || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        action: "CUSTOMER_CREATED",
        entityType: "Customer",
        entityId: customer.id,
        newValues: {
          name: customer.name,
          phone: customer.phone,
          tags: customer.tags,
        },
      },
    });

    return successResponse({ customer }, undefined, 201);
  } catch (err) {
    return handleRouteError(err);
  }
}
