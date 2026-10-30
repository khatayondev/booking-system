import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const startTime = Date.now();
  let dbStatus = "healthy";
  let dbLatencyMs = 0;
  let jobStats = {
    pending: 0,
    processing: 0,
    failed: 0,
    completed: 0,
  };

  // 1. Verify Database Connectivity & Latency
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - dbStart;
  } catch {
    dbStatus = "unhealthy";
  }

  // 2. Inspect Notification Job Queue Stats
  if (dbStatus === "healthy") {
    try {
      const [pending, processing, failed, completed] = await Promise.all([
        prisma.notificationJob.count({ where: { status: "PENDING" } }),
        prisma.notificationJob.count({ where: { status: "PROCESSING" } }),
        prisma.notificationJob.count({ where: { status: "FAILED" } }),
        prisma.notificationJob.count({ where: { status: "COMPLETED" } }),
      ]);
      jobStats = { pending, processing, failed, completed };
    } catch {
      // Non-fatal if jobs table is temporarily busy
    }
  }

  // 3. Inspect Database Tables & Catalog State
  let tables: string[] = [];
  let catalogDiagnostics: {
    categoriesCount?: number;
    servicesCount?: number;
    staffCount?: number;
    error?: string;
  } = {};

  if (dbStatus === "healthy") {
    try {
      const rows = await prisma.$queryRaw<{ table_name: string }[]>`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name ASC;
      `;
      tables = rows.map((r) => r.table_name);
    } catch (e: unknown) {
      catalogDiagnostics.error = e instanceof Error ? e.message : String(e);
    }

    try {
      const [categoriesCount, servicesCount, staffCount] = await Promise.all([
        prisma.serviceCategory.count(),
        prisma.service.count(),
        prisma.staff.count(),
      ]);
      catalogDiagnostics = {
        categoriesCount,
        servicesCount,
        staffCount,
      };
    } catch (e: unknown) {
      catalogDiagnostics.error = e instanceof Error ? e.message : String(e);
    }
  }

  // 4. System Memory & Process Stats
  const memUsage = process.memoryUsage();
  const uptimeSeconds = Math.round(process.uptime());

  const isHealthy = dbStatus === "healthy";
  const status = isHealthy ? (jobStats.failed > 20 ? "degraded" : "healthy") : "unhealthy";

  return NextResponse.json(
    {
      status,
      timestamp: new Date().toISOString(),
      timezone: "Africa/Accra",
      environment: process.env.NODE_ENV || "development",
      uptimeSeconds,
      responseTimeMs: Date.now() - startTime,
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
        tablesCount: tables.length,
        tables,
        catalogDiagnostics,
      },
      jobsQueue: {
        status: jobStats.failed > 10 ? "backlogged" : "healthy",
        ...jobStats,
      },
      system: {
        memoryHeapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
        memoryRssMB: Math.round(memUsage.rss / 1024 / 1024),
      },
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
