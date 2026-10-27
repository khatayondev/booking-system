import { prisma } from "@/lib/db";
import {
  requirePermission,
  PERMISSION_KEYS,
  PermissionContextUser,
  ROLES,
} from "@/lib/rbac";
import { AppError } from "@/lib/api-response";
import { normalizeGhanaPhone } from "@/lib/sms";
import type {
  CustomerSummary,
  CustomerDetail,
  CustomerListFilter,
  UpdateCustomerInput,
  MergeCustomersInput,
  AnonymizeCustomerInput,
  CustomerBookingHistoryItem,
  CustomerReceiptHistoryItem,
} from "./types";
import { Prisma } from "@prisma/client";

/**
 * Helper to compute customer summary fields from customer with bookings & receipts.
 */
function mapCustomerSummary(
  customer: Prisma.CustomerGetPayload<{
    include: {
      bookings: {
        include: {
          staff: true;
          items: { include: { service: true } };
        };
      };
      receipts: true;
    };
  }>
): CustomerSummary {
  const now = new Date();

  // Completed or non-cancelled visits count
  const completedVisits = customer.bookings.filter(
    (b) => b.status === "COMPLETED" || b.status === "CONFIRMED"
  );
  const visitCount = completedVisits.length;

  // Lifetime spend in pesewas (sum of confirmed booking payments + receipts without duplicate double counting)
  const bookingSpend = customer.bookings.reduce(
    (sum, b) => (b.status !== "CANCELLED" ? sum + b.amountPaidPesewas : sum),
    0
  );
  // Receipts that don't duplicate a booking payment
  const receiptSpend = customer.receipts.reduce(
    (sum, r) => (r.status === "PAID" && !r.bookingId ? sum + r.totalPesewas : sum),
    0
  );
  const lifetimeSpendPesewas = bookingSpend + receiptSpend;

  // Last visit: Most recent past completed booking or receipt
  const pastBookings = customer.bookings
    .filter((b) => b.startUtc <= now && b.status !== "CANCELLED")
    .sort((a, b) => b.startUtc.getTime() - a.startUtc.getTime());
  const lastVisit = pastBookings.length > 0 ? pastBookings[0].startUtc.toISOString() : null;

  // Upcoming booking: Next future booking
  const futureBookings = customer.bookings
    .filter((b) => b.startUtc > now && b.status !== "CANCELLED")
    .sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

  const upcomingBooking =
    futureBookings.length > 0
      ? {
          id: futureBookings[0].id,
          reference: futureBookings[0].reference,
          startUtc: futureBookings[0].startUtc.toISOString(),
          serviceNames: futureBookings[0].items.map((i) => i.service.name),
        }
      : null;

  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
    tags: customer.tags,
    allergies: customer.allergies,
    preferences: customer.preferences,
    marketingConsent: customer.marketingConsent,
    isAnonymized: customer.isAnonymized,
    visitCount,
    lifetimeSpendPesewas,
    lastVisit,
    upcomingBooking,
    createdAt: customer.createdAt.toISOString(),
  };
}

/**
 * List all customers with searching, tag filtering, allergies filtering, and pagination.
 */
export async function listCustomers(
  filter: CustomerListFilter = {},
  user: PermissionContextUser
): Promise<{ customers: CustomerSummary[]; total: number; page: number; totalPages: number }> {
  requirePermission(user, PERMISSION_KEYS.CUSTOMERS_VIEW);

  const page = Math.max(1, filter.page || 1);
  const limit = Math.min(100, Math.max(1, filter.limit || 25));
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
  };

  // Search by name, phone, or email
  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  // Filter by tag (e.g. VIP, Bridal)
  if (filter.tag?.trim()) {
    where.tags = { has: filter.tag.trim() };
  }

  // Filter by allergies
  if (filter.hasAllergies === true) {
    where.allergies = { not: null };
  }

  // Filter by marketing consent
  if (filter.marketingConsent !== undefined) {
    where.marketingConsent = filter.marketingConsent;
  }

  const [total, dbCustomers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        bookings: {
          include: {
            staff: true,
            items: { include: { service: true } },
          },
        },
        receipts: true,
      },
    }),
  ]);

  const customers = dbCustomers.map(mapCustomerSummary);

  return {
    customers,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Fetch full Customer dossier (profile, booking history, receipt history).
 */
export async function getCustomerDetail(
  id: string,
  user: PermissionContextUser
): Promise<CustomerDetail> {
  requirePermission(user, PERMISSION_KEYS.CUSTOMERS_VIEW);

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      bookings: {
        orderBy: { startUtc: "desc" },
        include: {
          staff: true,
          items: { include: { service: true } },
        },
      },
      receipts: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!customer || customer.deletedAt !== null) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  const summary = mapCustomerSummary(customer);

  const bookingHistory: CustomerBookingHistoryItem[] = customer.bookings.map((b) => ({
    id: b.id,
    reference: b.reference,
    status: b.status,
    source: b.source,
    startUtc: b.startUtc.toISOString(),
    endUtc: b.endUtc.toISOString(),
    totalPesewas: b.totalPesewas,
    amountPaidPesewas: b.amountPaidPesewas,
    staffName: b.staff?.name || "Assigned Stylist",
    services: b.items.map((i) => i.service.name),
  }));

  const receiptHistory: CustomerReceiptHistoryItem[] = customer.receipts.map((r) => ({
    id: r.id,
    receiptNumber: r.receiptNumber,
    status: r.status,
    totalPesewas: r.totalPesewas,
    amountPaidPesewas: r.amountPaidPesewas,
    createdAt: r.createdAt.toISOString(),
  }));

  return {
    ...summary,
    notes: customer.notes,
    marketingConsentAt: customer.marketingConsentAt?.toISOString() || null,
    anonymizedAt: customer.anonymizedAt?.toISOString() || null,
    bookings: bookingHistory,
    receipts: receiptHistory,
  };
}

/**
 * Update Customer profile (contact info, allergies, preferences, tags, marketing consent).
 */
export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  user: PermissionContextUser
): Promise<CustomerDetail> {
  requirePermission(user, PERMISSION_KEYS.CUSTOMERS_EDIT);

  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing || existing.deletedAt !== null) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  const dataToUpdate: Prisma.CustomerUpdateInput = {};

  if (input.name !== undefined) {
    const trimmed = input.name.trim();
    if (!trimmed) throw new AppError("Customer name cannot be empty", 400);
    dataToUpdate.name = trimmed;
  }

  if (input.phone !== undefined) {
    const normPhone = normalizeGhanaPhone(input.phone);
    if (normPhone !== existing.phone) {
      const phoneConflict = await prisma.customer.findUnique({
        where: { phone: normPhone },
      });
      if (phoneConflict && phoneConflict.id !== id && phoneConflict.deletedAt === null) {
        throw new AppError(
          `A customer with phone number ${normPhone} already exists. Consider merging duplicate profiles.`,
          409,
          "PHONE_CONFLICT"
        );
      }
      dataToUpdate.phone = normPhone;
    }
  }

  if (input.email !== undefined) {
    dataToUpdate.email = input.email?.trim() || null;
  }

  if (input.notes !== undefined) {
    dataToUpdate.notes = input.notes?.trim() || null;
  }

  if (input.allergies !== undefined) {
    dataToUpdate.allergies = input.allergies?.trim() || null;
  }

  if (input.preferences !== undefined) {
    dataToUpdate.preferences = input.preferences?.trim() || null;
  }

  if (input.tags !== undefined) {
    // Normalise tags (uppercase, deduplicated)
    const cleanedTags = Array.from(
      new Set(input.tags.map((t) => t.trim().toUpperCase()).filter(Boolean))
    );
    dataToUpdate.tags = cleanedTags;
  }

  if (input.marketingConsent !== undefined) {
    dataToUpdate.marketingConsent = input.marketingConsent;
    if (input.marketingConsent && !existing.marketingConsent) {
      dataToUpdate.marketingConsentAt = new Date();
    }
  }

  await prisma.customer.update({
    where: { id },
    data: dataToUpdate,
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.userId,
      action: "CUSTOMER_UPDATED",
      entityType: "Customer",
      entityId: id,
      newValues: {
        updatedFields: Object.keys(dataToUpdate),
        name: dataToUpdate.name ?? existing.name,
      },
    },
  });

  return getCustomerDetail(id, user);
}

/**
 * Duplicate Merge: Merges a duplicate customer into a primary customer.
 * Permission: Manager and above (CUSTOMERS_MERGE). Staff is strictly forbidden.
 */
export async function mergeCustomers(
  input: MergeCustomersInput,
  user: PermissionContextUser
): Promise<CustomerDetail> {
  // Enforce role permission: Manager and above
  requirePermission(user, PERMISSION_KEYS.CUSTOMERS_MERGE);

  const { primaryCustomerId, duplicateCustomerId } = input;

  if (primaryCustomerId === duplicateCustomerId) {
    throw new AppError("Cannot merge a customer into themselves", 400, "BAD_REQUEST");
  }

  const [primary, duplicate] = await Promise.all([
    prisma.customer.findUnique({
      where: { id: primaryCustomerId },
      include: { bookings: true, receipts: true },
    }),
    prisma.customer.findUnique({
      where: { id: duplicateCustomerId },
      include: { bookings: true, receipts: true },
    }),
  ]);

  if (!primary || primary.deletedAt !== null) {
    throw new AppError("Primary customer not found", 404, "NOT_FOUND");
  }
  if (!duplicate || duplicate.deletedAt !== null) {
    throw new AppError("Duplicate customer not found", 404, "NOT_FOUND");
  }

  // Perform atomic merge in transaction
  await prisma.$transaction(async (tx) => {
    // 1. Move all bookings from duplicate to primary
    await tx.booking.updateMany({
      where: { customerId: duplicateCustomerId },
      data: { customerId: primaryCustomerId },
    });

    // 2. Move all receipts from duplicate to primary
    await tx.receipt.updateMany({
      where: { customerId: duplicateCustomerId },
      data: { customerId: primaryCustomerId },
    });

    // 3. Combine unique tags (e.g. VIP, Bridal)
    const combinedTags = Array.from(
      new Set([...primary.tags, ...duplicate.tags].map((t) => t.trim().toUpperCase()))
    );

    // 4. Combine allergies (do not lose sensitivity warnings)
    let combinedAllergies = primary.allergies;
    if (duplicate.allergies) {
      if (primary.allergies) {
        if (!primary.allergies.toLowerCase().includes(duplicate.allergies.toLowerCase())) {
          combinedAllergies = `${primary.allergies}; ${duplicate.allergies}`;
        }
      } else {
        combinedAllergies = duplicate.allergies;
      }
    }

    // 5. Combine preferences
    let combinedPreferences = primary.preferences;
    if (duplicate.preferences) {
      if (primary.preferences) {
        if (!primary.preferences.toLowerCase().includes(duplicate.preferences.toLowerCase())) {
          combinedPreferences = `${primary.preferences}; ${duplicate.preferences}`;
        }
      } else {
        combinedPreferences = duplicate.preferences;
      }
    }

    // 6. Combine notes
    let combinedNotes = primary.notes;
    if (duplicate.notes) {
      if (primary.notes) {
        combinedNotes = `${primary.notes}\n[Merged Note]: ${duplicate.notes}`;
      } else {
        combinedNotes = duplicate.notes;
      }
    }

    // 7. Update primary customer with combined fields
    await tx.customer.update({
      where: { id: primaryCustomerId },
      data: {
        tags: combinedTags,
        allergies: combinedAllergies,
        preferences: combinedPreferences,
        notes: combinedNotes,
        marketingConsent: primary.marketingConsent || duplicate.marketingConsent,
        email: primary.email || duplicate.email,
      },
    });

    // 8. Soft-delete and rename phone on duplicate to free up unique phone index
    const archivedPhone = `${duplicate.phone}_merged_${Date.now()}`;
    await tx.customer.update({
      where: { id: duplicateCustomerId },
      data: {
        phone: archivedPhone,
        deletedAt: new Date(),
        notes: `Merged into ${primary.name} (${primary.phone}) on ${new Date().toISOString()}`,
      },
    });

    // 9. Audit log
    await tx.auditLog.create({
      data: {
        userId: user.userId,
        action: "CUSTOMER_MERGED",
        entityType: "Customer",
        entityId: primaryCustomerId,
        newValues: {
          primaryCustomerId,
          duplicateCustomerId,
          duplicateOriginalPhone: duplicate.phone,
          duplicateOriginalName: duplicate.name,
          bookingsMovedCount: duplicate.bookings.length,
          receiptsMovedCount: duplicate.receipts.length,
          combinedTags,
        },
      },
    });
  });

  return getCustomerDetail(primaryCustomerId, user);
}

/**
 * CSV Export: Generates a CSV file of customer records.
 * Permission: Manager and above (CUSTOMERS_EXPORT). Staff is strictly forbidden.
 */
export async function exportCustomersCsv(
  filter: CustomerListFilter = {},
  user: PermissionContextUser
): Promise<string> {
  requirePermission(user, PERMISSION_KEYS.CUSTOMERS_EXPORT);

  const where: Prisma.CustomerWhereInput = {
    deletedAt: null,
  };

  if (filter.q?.trim()) {
    const q = filter.q.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  if (filter.tag?.trim()) {
    where.tags = { has: filter.tag.trim() };
  }

  if (filter.hasAllergies === true) {
    where.allergies = { not: null };
  }

  if (filter.marketingConsent !== undefined) {
    where.marketingConsent = filter.marketingConsent;
  }

  const customers = await prisma.customer.findMany({
    where,
    take: 5000,
    orderBy: { createdAt: "desc" },
    include: {
      bookings: {
        include: {
          staff: true,
          items: { include: { service: true } },
        },
      },
      receipts: true,
    },
  });

  const summaries = customers.map(mapCustomerSummary);

  const headers = [
    "Customer ID",
    "Name",
    "Phone",
    "Email",
    "Tags",
    "Allergies & Sensitivities",
    "Preferences",
    "Marketing Consent",
    "Visit Count",
    "Lifetime Spend (GHS)",
    "Last Visit",
    "Created Date",
  ];

  const escapeCsv = (val: string | number | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = summaries.map((c) => [
    escapeCsv(c.id),
    escapeCsv(c.name),
    escapeCsv(c.phone),
    escapeCsv(c.email || ""),
    escapeCsv(c.tags.join("; ")),
    escapeCsv(c.allergies || ""),
    escapeCsv(c.preferences || ""),
    escapeCsv(c.marketingConsent ? "Yes" : "No"),
    escapeCsv(c.visitCount),
    escapeCsv((c.lifetimeSpendPesewas / 100).toFixed(2)),
    escapeCsv(c.lastVisit ? new Date(c.lastVisit).toLocaleDateString("en-GB") : "Never"),
    escapeCsv(new Date(c.createdAt).toLocaleDateString("en-GB")),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Anonymize or Delete Customer consistent with Ghana Data Protection Act (Act 843) principles.
 * Strict Constraint: Owner-Only action (OWNER_ADMIN). Non-owners are forbidden.
 */
export async function anonymizeOrDeleteCustomer(
  id: string,
  input: AnonymizeCustomerInput,
  user: PermissionContextUser
): Promise<{ success: boolean; message: string; customerId: string }> {
  // Only Owner is authorized to execute Data Protection Erasure / Anonymization
  if (user.role !== ROLES.OWNER_ADMIN) {
    throw new AppError(
      "Forbidden: Anonymization and deletion under the Ghana Data Protection Act (Act 843) can only be authorized by the Studio Owner.",
      403,
      "OWNER_REQUIRED"
    );
  }

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: { bookings: true, receipts: true },
  });

  if (!customer) {
    throw new AppError("Customer not found", 404, "NOT_FOUND");
  }

  if (input.action === "ANONYMIZE") {
    // Replace PII with anonymized pseudonym:
    // Preserves booking/receipt numbers for tax/audit ledgering without personal identification
    const pseudonym = `Anonymized Client ${customer.id.slice(0, 6).toUpperCase()}`;
    const pseudonymPhone = `+233000${Date.now().toString().slice(-6)}`;

    await prisma.customer.update({
      where: { id },
      data: {
        name: pseudonym,
        phone: pseudonymPhone,
        email: null,
        notes: null,
        allergies: null,
        preferences: null,
        tags: [],
        marketingConsent: false,
        isAnonymized: true,
        anonymizedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CUSTOMER_ANONYMIZED_ACT843",
        entityType: "Customer",
        entityId: id,
        newValues: {
          anonymizedAt: new Date().toISOString(),
          reason: input.reason || "Ghana Data Protection Act (Act 843) erasure request",
          bookingsRetainedCount: customer.bookings.length,
          receiptsRetainedCount: customer.receipts.length,
        },
      },
    });

    return {
      success: true,
      message: "Customer personal data has been permanently anonymized under Ghana Data Protection Act (Act 843).",
      customerId: id,
    };
  } else {
    // DELETE action: Soft-delete customer
    const archivedPhone = `+233999${Date.now().toString().slice(-6)}`;
    await prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        phone: archivedPhone,
        email: null,
        allergies: null,
        preferences: null,
        notes: `Permanently removed on ${new Date().toISOString()}`,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.userId,
        action: "CUSTOMER_DELETED",
        entityType: "Customer",
        entityId: id,
        newValues: {
          deletedAt: new Date().toISOString(),
          reason: input.reason || "Owner requested customer record deletion",
        },
      },
    });

    return {
      success: true,
      message: "Customer record has been successfully deleted.",
      customerId: id,
    };
  }
}
