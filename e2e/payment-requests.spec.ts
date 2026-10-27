import { test, expect } from "@playwright/test";
import { prisma } from "../lib/db";
import crypto from "crypto";

test.describe("Prompt 15: Payment Requests End-to-End Acceptance", () => {
  let testCustomer: { id: string; name: string; phone: string };
  let testStaff: { id: string; name: string };
  let testBooking: { id: string; reference: string; totalPesewas: number; depositPaidPesewas: number };

  test.beforeAll(async () => {
    // 1. Ensure test staff member exists
    const staff = await prisma.staff.create({
      data: {
        name: `E2E Stylist ${Date.now()}`,
        phone: `+23324${Math.floor(1000000 + Math.random() * 8999999)}`,
        active: true,
      },
    });
    testStaff = { id: staff.id, name: staff.name };

    // 2. Ensure test customer exists
    const testPhone = `+23324${Math.floor(1000000 + Math.random() * 8999999)}`;
    const customer = await prisma.customer.create({
      data: {
        name: "Abena Mansa",
        phone: testPhone,
        email: "abena.mansa@example.com",
      },
    });
    testCustomer = { id: customer.id, name: customer.name, phone: customer.phone };

    // 3. Reset lockout on owner account
    await prisma.user.updateMany({
      where: { email: "owner@aurastudio.gh" },
      data: {
        lockedUntil: null,
        failedLoginAttempts: 0,
      },
    });

    // 4. Create active service
    let service = await prisma.service.findFirst({
      where: { active: true, deletedAt: null },
    });
    if (!service) {
      const cat = await prisma.serviceCategory.findFirst();
      service = await prisma.service.create({
        data: {
          categoryId: cat!.id,
          name: "Bridal Full Glam Styling",
          pricePesewas: 30000,
          durationMin: 60,
          active: true,
        },
      });
    }

    // 5. Seed test booking with outstanding balance: Total 300 GHS, Paid 100 GHS, Balance 200 GHS
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30 + Math.floor(Math.random() * 100));
    futureDate.setUTCHours(11, 0, 0, 0);
    const endFutureDate = new Date(futureDate.getTime() + 60 * 60 * 1000);

    const bookingRef = `BK-E2E-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const manageToken = crypto.randomBytes(32).toString("hex");
    const manageTokenHash = crypto.createHash("sha256").update(manageToken).digest("hex");

    const booking = await prisma.booking.create({
      data: {
        reference: bookingRef,
        status: "CONFIRMED",
        source: "WEB",
        startUtc: futureDate,
        endUtc: endFutureDate,
        staffId: testStaff.id,
        customerId: testCustomer.id,
        subtotalPesewas: 30000,
        totalPesewas: 30000,
        depositRequiredPesewas: 10000,
        amountPaidPesewas: 10000,
        manageTokenHash,
        items: {
          create: {
            serviceId: service.id,
            pricePesewas: 30000,
            durationMin: 60,
          },
        },
      },
    });

    testBooking = {
      id: booking.id,
      reference: bookingRef,
      totalPesewas: 30000,
      depositPaidPesewas: 10000,
    };
  });

  test.afterAll(async () => {
    if (testCustomer?.id) {
      await prisma.paymentRequest.deleteMany({
        where: { booking: { customerId: testCustomer.id } },
      }).catch(() => {});
      await prisma.receipt.deleteMany({
        where: { customerId: testCustomer.id },
      }).catch(() => {});
      await prisma.payment.deleteMany({
        where: { booking: { customerId: testCustomer.id } },
      }).catch(() => {});
      await prisma.bookingItem.deleteMany({
        where: { booking: { customerId: testCustomer.id } },
      }).catch(() => {});
      await prisma.booking.deleteMany({
        where: { customerId: testCustomer.id },
      }).catch(() => {});
      await prisma.customer.delete({
        where: { id: testCustomer.id },
      }).catch(() => {});
    }
    if (testStaff?.id) {
      await prisma.staff.delete({
        where: { id: testStaff.id },
      }).catch(() => {});
    }
  });

  test("Acceptance: staff sends payment request, customer page shows banner within 3s, payment succeeds, dashboard flips to Paid & booking balance updates", async ({
    browser,
  }) => {
    // Two isolated browser contexts: One for customer, one for staff
    const customerContext = await browser.newContext();
    const staffContext = await browser.newContext();

    const customerPage = await customerContext.newPage();
    const staffPage = await staffContext.newPage();

    // -------------------------------------------------------------------------
    // Step 1: Customer opens their private booking confirmation page
    // -------------------------------------------------------------------------
    await customerPage.goto(`/booking/confirmation?ref=${encodeURIComponent(testBooking.reference)}`);
    await expect(customerPage.getByText(testBooking.reference)).toBeVisible({ timeout: 10000 });

    // Verify initially no payment request banner is present
    await expect(customerPage.getByText("Payment Request Received")).not.toBeVisible();

    // -------------------------------------------------------------------------
    // Step 2: Staff logs in to dashboard and opens the booking detail drawer
    // -------------------------------------------------------------------------
    await staffPage.goto("/login");
    await staffPage.getByLabel("Email or Ghana Phone").fill("owner@aurastudio.gh");
    await staffPage.getByLabel("Password", { exact: true }).fill("AuraStudio2026!Secure");
    await staffPage.getByRole("button", { name: "Sign In" }).click();
    await expect(staffPage).toHaveURL(/\/dashboard/);

    await staffPage.goto("/bookings");
    await expect(staffPage.getByRole("heading", { name: "Appointments & Bookings" })).toBeVisible();

    // Switch to List View
    await staffPage.getByRole("button", { name: "List View" }).click();

    // Search for test booking
    const searchInput = staffPage.getByPlaceholder("Search by client name, +233 phone, or BK-XXXX...");
    await searchInput.fill(testBooking.reference);

    const bookingRow = staffPage.getByText(testBooking.reference);
    await expect(bookingRow).toBeVisible();
    await bookingRow.click();

    // Booking detail drawer opens
    await expect(staffPage.getByText("Payment Summary")).toBeVisible();
    await expect(staffPage.getByText("GH₵ 200.00", { exact: true }).first()).toBeVisible(); // Remaining balance

    // -------------------------------------------------------------------------
    // Step 3: Staff clicks 'Request Payment', fills amount & message, submits
    // -------------------------------------------------------------------------
    const requestPaymentBtn = staffPage.getByRole("button", { name: /Request Payment/i }).first();
    await expect(requestPaymentBtn).toBeVisible();
    await requestPaymentBtn.click();

    // Request Payment modal opens
    await expect(staffPage.getByRole("heading", { name: "Request Payment" })).toBeVisible();

    // Fill optional custom message
    const messageInput = staffPage.getByPlaceholder("e.g. Please settle the remaining bridal balance before your appointment.");
    await messageInput.fill("Please settle remaining bridal balance of GH₵ 200.00.");

    // Submit request
    const sendBtn = staffPage.getByRole("button", { name: /Send Request/i });
    await sendBtn.click();

    // Modal closes
    await expect(staffPage.getByRole("heading", { name: "Request Payment" })).not.toBeVisible({ timeout: 5000 });

    // -------------------------------------------------------------------------
    // Step 4: Acceptance Criteria (a): Customer page shows banner within 3 seconds
    // -------------------------------------------------------------------------
    const banner = customerPage.getByText("Payment Request Received");
    // Strict requirement: within 3 seconds
    await expect(banner).toBeVisible({ timeout: 3000 });
    await expect(customerPage.getByText("GH₵ 200.00").first()).toBeVisible();
    await expect(customerPage.getByText("Please settle remaining bridal balance of GH₵ 200.00.")).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 5: Acceptance Criteria (b): Customer clicks 'Pay Now' & payment succeeds
    // -------------------------------------------------------------------------
    const payNowBtn = customerPage.getByRole("link", { name: /Pay GH₵ 200.00 Now/i });
    await expect(payNowBtn).toBeVisible();
    await payNowBtn.click();

    // Customer lands on secure public payment page (/pay/[token])
    await expect(customerPage).toHaveURL(/\/pay\//);
    await expect(customerPage.getByRole("heading", { name: "Complete Your Payment" })).toBeVisible();
    await expect(customerPage.getByText("GH₵ 200.00").first()).toBeVisible();

    // Fill MoMo phone number & submit payment
    const momoPhoneInput = customerPage.getByLabel("Mobile Money Wallet Number");
    await momoPhoneInput.fill("0244123456");

    const submitPaymentBtn = customerPage.getByRole("button", { name: /Pay GH₵ 200.00 Now/i });
    await submitPaymentBtn.click();

    // Payment succeeds: Receipt displayed
    await expect(customerPage.getByRole("heading", { name: "Payment Received!" })).toBeVisible({ timeout: 10000 });
    await expect(customerPage.getByText("View Official Thermal Receipt")).toBeVisible();

    // -------------------------------------------------------------------------
    // Step 6: Acceptance Criteria (c): Dashboard flips to Paid & balance updates
    // -------------------------------------------------------------------------
    // The staff page receives SSE event PAYMENT_REQUEST_PAID and updates live
    const paidBadge = staffPage.getByText("Paid").first();
    await expect(paidBadge).toBeVisible({ timeout: 10000 });

    // Verify booking balance updates on dashboard
    await expect(staffPage.getByText(/Remaining Balance/i)).toBeVisible();
    await expect(staffPage.getByText("GH₵ 0.00")).toBeVisible({ timeout: 10000 });

    // Clean up contexts
    await customerContext.close();
    await staffContext.close();
  });
});
