/**
 * Audit Log Service.
 * Implements append-only storage and comprehensive search/filtering for Owner-only visibility.
 * Provides before/after diff computation and non-repudiable audit trail tracking.
 */

import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface CreateAuditLogInput {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface AuditLogFilterInput {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  userId?: string;
  startDate?: Date | string;
  endDate?: Date | string;
  search?: string;
}

export interface ValueDiffItem {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface FormattedAuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  timestamp: string; // ISO in Africa/Accra
  user: {
    id: string;
    name: string;
    email: string;
    role?: string;
  } | null;
  ipAddress: string | null;
  userAgent: string | null;
  diffs: ValueDiffItem[];
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
}

/**
 * Computes the key-by-key differences between oldValues and newValues.
 */
export function computeAuditDiff(
  oldValues: Record<string, unknown> | null | undefined,
  newValues: Record<string, unknown> | null | undefined
): ValueDiffItem[] {
  if (!oldValues && !newValues) return [];

  const oldObj = (oldValues || {}) as Record<string, unknown>;
  const newObj = (newValues || {}) as Record<string, unknown>;

  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);
  const diffs: ValueDiffItem[] = [];

  for (const key of allKeys) {
    const valOld = oldObj[key];
    const valNew = newObj[key];

    // Deep compare or JSON compare
    if (JSON.stringify(valOld) !== JSON.stringify(valNew)) {
      diffs.push({
        field: key,
        oldValue: valOld === undefined ? null : valOld,
        newValue: valNew === undefined ? null : valNew,
      });
    }
  }

  return diffs;
}

/**
 * Appends a new audit log record. Storage is strictly append-only.
 */
export async function logAuditEvent(input: CreateAuditLogInput) {
  return await prisma.auditLog.create({
    data: {
      userId: input.userId || null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId || null,
      oldValues: input.oldValues ? (input.oldValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      newValues: input.newValues ? (input.newValues as Prisma.InputJsonValue) : Prisma.JsonNull,
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
    },
  });
}

/**
 * Retrieves audit logs matching the given filters with pagination.
 */
export async function getAuditLogs(filters: AuditLogFilterInput = {}) {
  const page = Math.max(1, filters.page || 1);
  const limit = Math.min(100, Math.max(1, filters.limit || 50));
  const skip = (page - 1) * limit;

  const where: Prisma.AuditLogWhereInput = {};

  if (filters.action) {
    where.action = { contains: filters.action, mode: "insensitive" };
  }

  if (filters.entityType && filters.entityType !== "ALL") {
    where.entityType = { equals: filters.entityType, mode: "insensitive" };
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) {
      const s = new Date(filters.startDate);
      s.setUTCHours(0, 0, 0, 0);
      where.createdAt.gte = s;
    }
    if (filters.endDate) {
      const e = new Date(filters.endDate);
      e.setUTCHours(23, 59, 59, 999);
      where.createdAt.lte = e;
    }
  }

  if (filters.search && filters.search.trim().length > 0) {
    const q = filters.search.trim();
    where.OR = [
      { action: { contains: q, mode: "insensitive" } },
      { entityType: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
      {
        user: {
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        },
      },
    ];
  }

  const [totalCount, records] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
  ]);

  const formattedLogs: FormattedAuditLogEntry[] = records.map((log) => {
    const oldValObj = log.oldValues && typeof log.oldValues === "object" ? (log.oldValues as Record<string, unknown>) : null;
    const newValObj = log.newValues && typeof log.newValues === "object" ? (log.newValues as Record<string, unknown>) : null;

    return {
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      timestamp: log.createdAt.toISOString(),
      user: log.user
        ? {
            id: log.user.id,
            name: log.user.name,
            email: log.user.email,
            role: log.user.role?.name,
          }
        : null,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      diffs: computeAuditDiff(oldValObj, newValObj),
      oldValues: oldValObj,
      newValues: newValObj,
    };
  });

  return {
    logs: formattedLogs,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + records.length < totalCount,
    },
  };
}
