import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting database cleanup and demo reset...");

  const LEAD_STAFF_ID = "211fdd80-08f6-4204-84dd-08a1a78a6371";

  // 1. Verify Lead Staff exists
  const leadStaff = await prisma.staff.findUnique({
    where: { id: LEAD_STAFF_ID },
  });
  if (!leadStaff) {
    throw new Error(`Lead staff with id ${LEAD_STAFF_ID} not found!`);
  }
  console.log(`✅ Preserving Lead Stylist: ${leadStaff.name} (${leadStaff.id})`);

  // 2. Execute deletion inside a clean transaction
  await prisma.$transaction(async (tx) => {
    console.log("🧹 Clearing test financial and booking records...");
    await tx.refund.deleteMany({});
    await tx.paymentRequest.deleteMany({});
    await tx.payment.deleteMany({});
    await tx.receipt.deleteMany({});
    await tx.bookingItem.deleteMany({});
    await tx.slotHold.deleteMany({});
    await tx.booking.deleteMany({});

    console.log("🧹 Clearing temporary test staff members and schedule allocations...");
    await tx.staffSchedule.deleteMany({
      where: { staffId: { not: LEAD_STAFF_ID } },
    });
    await tx.staffService.deleteMany({
      where: { staffId: { not: LEAD_STAFF_ID } },
    });
    await tx.staff.deleteMany({
      where: { id: { not: LEAD_STAFF_ID } },
    });

    console.log("🧹 Cleaning customer list and setting up dedicated testing accounts...");
    // Keep or create default walk-in customer
    await tx.customer.upsert({
      where: { phone: "+233000000000" },
      update: { name: "Walk-in Guest" },
      create: {
        name: "Walk-in Guest",
        phone: "+233000000000",
        notes: "System default customer for POS walk-in sales without registered profile",
      },
    });

    // Create the one primary testing customer
    const testCustomer = await tx.customer.upsert({
      where: { phone: "+233240001111" },
      update: {
        name: "Ama Mensah",
        email: "ama.mensah@example.com",
        notes: "Dedicated testing account for feature validation",
      },
      create: {
        name: "Ama Mensah",
        phone: "+233240001111",
        email: "ama.mensah@example.com",
        notes: "Dedicated testing account for feature validation",
      },
    });

    // Delete all other customers
    await tx.customer.deleteMany({
      where: {
        phone: { notIn: ["+233000000000", "+233240001111"] },
      },
    });

    // Reset receipt counter to R-000100
    await tx.receiptCounter.upsert({
      where: { prefix: "R" },
      update: { lastNumber: 100 },
      create: { prefix: "R", lastNumber: 100 },
    });

    // Ensure all active services are linked to the Lead Stylist
    const allServices = await tx.service.findMany({ where: { active: true } });
    for (const svc of allServices) {
      await tx.staffService.upsert({
        where: {
          staffId_serviceId: {
            staffId: LEAD_STAFF_ID,
            serviceId: svc.id,
          },
        },
        update: {},
        create: {
          staffId: LEAD_STAFF_ID,
          serviceId: svc.id,
        },
      });
    }

    // 3. Create ONE active real sample booking for Ama Mensah
    const primaryService = allServices.find((s) => s.name.includes("Bridal Soft Glam")) || allServices[0];
    
    // Set for tomorrow at 10:00 AM (Accra time is UTC)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setUTCHours(10, 0, 0, 0);
    const endUtc = new Date(tomorrow.getTime() + primaryService.durationMin * 60 * 1000);

    const rawManageToken = crypto.randomBytes(24).toString("hex");
    const manageTokenHash = crypto.createHash("sha256").update(rawManageToken).digest("hex");

    const bookingRef = "BK-TEST01";
    const depositPesewas = Math.round(primaryService.pricePesewas * 0.4); // 40% deposit

    console.log(`✨ Seeding verified live appointment (${bookingRef}) for ${testCustomer.name}...`);
    const booking = await tx.booking.create({
      data: {
        reference: bookingRef,
        source: "WEB",
        status: "CONFIRMED",
        startUtc: tomorrow,
        endUtc,
        staffId: LEAD_STAFF_ID,
        customerId: testCustomer.id,
        subtotalPesewas: primaryService.pricePesewas,
        discountPesewas: 0,
        totalPesewas: primaryService.pricePesewas,
        depositRequiredPesewas: depositPesewas,
        amountPaidPesewas: depositPesewas,
        notes: "Test booking: Bridal soft glam preview session. Bride requested warm champagne palette.",
        manageTokenHash,
        items: {
          create: [
            {
              serviceId: primaryService.id,
              pricePesewas: primaryService.pricePesewas,
              durationMin: primaryService.durationMin,
            },
          ],
        },
      },
    });

    // Record initial deposit payment
    await tx.payment.create({
      data: {
        bookingId: booking.id,
        reference: "PAY-TEST-DEP-001",
        amountPesewas: depositPesewas,
        currency: "GHS",
        status: "PAID",
        channel: "MOBILE_MONEY",
        providerReference: "MTN-MOMO-233240001111",
        paidAt: new Date(),
      },
    });

    console.log("✅ Booking and payment seeded successfully!");
    console.log(`   Reference: ${bookingRef}`);
    console.log(`   Customer: ${testCustomer.name} (${testCustomer.phone})`);
    console.log(`   Service: ${primaryService.name}`);
    console.log(`   Date: ${tomorrow.toUTCString()}`);
    console.log(`   Total: GH₵ ${(primaryService.pricePesewas / 100).toFixed(2)} | Paid: GH₵ ${(depositPesewas / 100).toFixed(2)} | Due: GH₵ ${((primaryService.pricePesewas - depositPesewas) / 100).toFixed(2)}`);
    console.log(`   Manage Link: http://localhost:3000/manage/${rawManageToken}`);
  });

  console.log("\n🎉 Database cleanup complete! Clean testing environment ready.");
}

main()
  .catch((e) => {
    console.error("❌ Cleanup failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
