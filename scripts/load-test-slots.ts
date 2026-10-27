import { PrismaClient } from "@prisma/client";
import { createSlotHold, releaseSlotHold, getAvailabilitySlots } from "../lib/availability";

const prisma = new PrismaClient();

async function runSlotEngineLoadTest() {
  console.log("=========================================================");
  console.log(" ⚡ Aura Studio - Slot Engine Concurrency & Load Benchmark");
  console.log("=========================================================\n");

  // 1. Fetch active service and staff
  const service = await prisma.service.findFirst({
    where: { active: true, deletedAt: null },
  });

  const staff = await prisma.staff.findFirst({
    where: { active: true, deletedAt: null },
  });

  if (!service || !staff) {
    console.error("❌ Need at least 1 active service and 1 active staff in DB to benchmark.");
    process.exit(1);
  }

  console.log(`Using Service: "${service.name}" (${service.durationMin}m, ${service.id})`);
  console.log(`Using Staff:   "${staff.name}" (${staff.id})\n`);

  // Choose a timestamp in the future (e.g. 10 days from now at 11:00 UTC)
  const targetDate = new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() + 10);
  targetDate.setUTCHours(11, 0, 0, 0);

  // Clean any existing test holds for that slot
  await prisma.slotHold.deleteMany({
    where: {
      staffId: staff.id,
      startUtc: targetDate,
    },
  });

  // Ensure staff schedule covers that day & time
  const targetWeekday = targetDate.getUTCDay();
  const existingSchedule = await prisma.staffSchedule.findFirst({
    where: { staffId: staff.id, weekday: targetWeekday },
  });

  if (existingSchedule) {
    await prisma.staffSchedule.update({
      where: { id: existingSchedule.id },
      data: {
        startTime: "08:00",
        endTime: "20:00",
        isDayOff: false,
        active: true,
      },
    });
  } else {
    await prisma.staffSchedule.create({
      data: {
        staffId: staff.id,
        weekday: targetWeekday,
        startTime: "08:00",
        endTime: "20:00",
        isDayOff: false,
        active: true,
      },
    });
  }

  // Ensure staff is assigned to service
  await prisma.staffService.upsert({
    where: {
      staffId_serviceId: {
        staffId: staff.id,
        serviceId: service.id,
      },
    },
    update: {},
    create: {
      staffId: staff.id,
      serviceId: service.id,
    },
  });

  // -------------------------------------------------------------------------
  // TEST PART 1: CONCURRENT RACE CONDITION STRESS TEST (Zero Double-Booking)
  // -------------------------------------------------------------------------
  const CONCURRENT_CLIENTS = 25;
  console.log(`--- PART 1: Concurrent Hold Contention (${CONCURRENT_CLIENTS} simultaneous requests) ---`);
  console.log(`Attempting to hold the EXACT same slot (${targetDate.toISOString()}) across ${CONCURRENT_CLIENTS} parallel calls...`);

  const startTime = Date.now();
  const holdPromises = Array.from({ length: CONCURRENT_CLIENTS }).map(async (_, idx) => {
    const reqStart = Date.now();
    try {
      const hold = await createSlotHold({
        serviceIds: [service.id],
        staffId: staff.id,
        startUtc: targetDate.toISOString(),
      });
      return { success: true, latencyMs: Date.now() - reqStart, holdId: hold.id, token: hold.token, clientIdx: idx };
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - reqStart,
        error: err instanceof Error ? err.message : String(err),
        clientIdx: idx,
      };
    }
  });

  const results = await Promise.all(holdPromises);
  const totalDuration = Date.now() - startTime;

  const successfulHolds = results.filter((r) => r.success);
  const rejectedHolds = results.filter((r) => !r.success);

  const latencies = results.map((r) => r.latencyMs);
  const avgLatency = Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);

  console.log(`\nResults:`);
  console.log(`  - Total Parallel Requests: ${CONCURRENT_CLIENTS}`);
  console.log(`  - Successful Holds:        ${successfulHolds.length} (Expected: 1)`);
  console.log(`  - Blocked / Conflicts:      ${rejectedHolds.length} (Expected: ${CONCURRENT_CLIENTS - 1})`);
  console.log(`  - Total Elapsed Time:      ${totalDuration}ms`);
  console.log(`  - Latency: avg=${avgLatency}ms, min=${minLatency}ms, max=${maxLatency}ms`);

  // Query DB directly to verify absolute exclusivity
  const activeHoldsInDb = await prisma.slotHold.findMany({
    where: {
      staffId: staff.id,
      startUtc: targetDate,
      expiresAt: { gt: new Date() },
    },
  });

  const zeroDoubleBooking = successfulHolds.length === 1 && activeHoldsInDb.length === 1;

  if (zeroDoubleBooking) {
    console.log(`\n✅ RACE CONDITION SHIELD PASSED: Exactly 1 client acquired the hold. Zero double-booking confirmed!`);
  } else {
    console.error(`\n❌ CONCURRENCY VIOLATION: Expected 1 hold, found ${activeHoldsInDb.length} in DB!`);
    process.exit(1);
  }

  // Release the test hold
  if (successfulHolds[0]?.token) {
    await releaseSlotHold(successfulHolds[0].token);
    console.log(`🧹 Test hold cleaned up.`);
  }

  // -------------------------------------------------------------------------
  // TEST PART 2: RAPID SLOT ENGINE SEARCH THROUGHPUT
  // -------------------------------------------------------------------------
  const SEARCH_ITERATIONS = 50;
  console.log(`\n--- PART 2: Availability Engine Query Throughput (${SEARCH_ITERATIONS} queries) ---`);
  const searchDateStr = targetDate.toISOString().split("T")[0];

  const searchStart = Date.now();
  const searchLatencies: number[] = [];

  for (let i = 0; i < SEARCH_ITERATIONS; i++) {
    const s0 = Date.now();
    await getAvailabilitySlots({
      startDate: searchDateStr,
      endDate: searchDateStr,
      serviceIds: [service.id],
      staffId: "any",
    });
    searchLatencies.push(Date.now() - s0);
  }

  const searchDuration = Date.now() - searchStart;
  const searchAvg = Math.round(searchLatencies.reduce((a, b) => a + b, 0) / searchLatencies.length);
  const searchMax = Math.max(...searchLatencies);
  const qps = Math.round((SEARCH_ITERATIONS / (searchDuration / 1000)) * 10) / 10;

  console.log(`Search Engine Metrics:`);
  console.log(`  - Total Iterations:  ${SEARCH_ITERATIONS}`);
  console.log(`  - Throughput (QPS):  ${qps} queries/sec`);
  console.log(`  - Average Query Time: ${searchAvg}ms`);
  console.log(`  - Max Query Time:     ${searchMax}ms`);
  console.log(`  - Overall Time:       ${searchDuration}ms`);

  console.log("\n=========================================================");
  console.log(" 🏆 Benchmark Summary Table");
  console.log("=========================================================");
  console.table([
    {
      Metric: "Concurrent Holds (Contention)",
      "Target/Req": `${CONCURRENT_CLIENTS} reqs`,
      "Success Rate": `${Math.round((1 / CONCURRENT_CLIENTS) * 100)}% (1 win)`,
      "Avg Latency": `${avgLatency}ms`,
      Status: "PASSED (Zero Double-Booking)",
    },
    {
      Metric: "Availability Search Engine",
      "Target/Req": `${SEARCH_ITERATIONS} queries`,
      "Success Rate": "100%",
      "Avg Latency": `${searchAvg}ms`,
      Status: `PASSED (${qps} QPS)`,
    },
  ]);
  console.log("=========================================================\n");
}

runSlotEngineLoadTest()
  .catch((err) => {
    console.error("❌ Load test failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
