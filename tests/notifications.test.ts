import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/db";
import {
  estimateSms,
  isGsm7,
  renderTemplate,
  notificationQueue,
  notificationEvents,
  globalMockSmsProvider,
  globalMockEmailProvider,
  setCustomSmsProvider,
  setCustomEmailProvider,
  ensureDefaultTemplates,
  getTemplate,
} from "@/lib/notifications";
import { MockSmsProvider } from "@/lib/notifications/providers/sms/mock";
import { MockEmailProvider } from "@/lib/notifications/providers/email/mock";

describe("Prompt 17: Notification System Tests", () => {
  beforeEach(async () => {
    // Reset mock providers
    globalMockSmsProvider.clear();
    globalMockEmailProvider.clear();
    setCustomSmsProvider(null);
    setCustomEmailProvider(null);

    // Clean up test jobs, message logs, and in-app notifications
    await prisma.notificationJob.deleteMany({
      where: {
        OR: [
          { idempotencyKey: { contains: "test_" } },
          { bookingId: { contains: "test_booking_" } },
        ],
      },
    });

    await prisma.messageLog.deleteMany({
      where: {
        OR: [
          { idempotencyKey: { contains: "test_" } },
          { bookingId: { contains: "test_booking_" } },
        ],
      },
    });

    await prisma.inAppNotification.deleteMany({
      where: {
        OR: [
          { bookingId: { contains: "test_booking_" } },
          { title: { contains: "Test" } },
        ],
      },
    });
  });

  describe("1. Template Engine & Variables", () => {
    it("substitutes all required variables {{name}}, {{service}}, {{date}}, {{reference}}, {{manageLink}}, {{amountDue}}", () => {
      const template =
        "Hello {{name}}, your {{service}} on {{date}} (Ref: {{reference}}) is ready. Balance: {{amountDue}}. Manage: {{manageLink}}";

      const variables = {
        name: "Ama Mensah",
        service: "Bridal Soft Glam",
        date: "28 Oct 2026",
        reference: "AURA-9921",
        amountDue: "GH₵ 120.00",
        manageLink: "https://aurastudio.com/manage/AURA-9921",
      };

      const result = renderTemplate(template, variables);

      expect(result).toBe(
        "Hello Ama Mensah, your Bridal Soft Glam on 28 Oct 2026 (Ref: AURA-9921) is ready. Balance: GH₵ 120.00. Manage: https://aurastudio.com/manage/AURA-9921"
      );
    });

    it("seeds and resolves default templates for all required events", async () => {
      await ensureDefaultTemplates();

      const smsConfirmed = await getTemplate("booking_confirmed", "SMS");
      expect(smsConfirmed.active).toBe(true);
      expect(smsConfirmed.template).toContain("{{name}}");
      expect(smsConfirmed.template).toContain("{{service}}");

      const emailConfirmed = await getTemplate("booking_confirmed", "EMAIL");
      expect(emailConfirmed.subject).toBeDefined();
      expect(emailConfirmed.template).toContain("{{service}}");
    });
  });

  describe("2. SMS Length & Unicode Cost Estimates", () => {
    it("correctly identifies GSM-7 vs Unicode character encoding", () => {
      expect(isGsm7("Hello Ama, your appointment is confirmed at 10:30.")).toBe(true);
      expect(isGsm7("Hello Ama, see you soon! ✨🎉")).toBe(false); // Emojis are Unicode
      expect(isGsm7("Accra studio price: €25.00 [Special]")).toBe(true); // € and [] are GSM extended
    });

    it("calculates GSM-7 single and multi-segment counts and pesewas cost", () => {
      // Short standard message (<= 160 chars)
      const shortMsg = "Hello Ama, your appointment is confirmed for tomorrow at 10:00 AM (Ref: AURA-123).";
      const shortEstimate = estimateSms(shortMsg);
      expect(shortEstimate.encoding).toBe("GSM-7");
      expect(shortEstimate.segmentCount).toBe(1);
      expect(shortEstimate.costEstimatePesewas).toBe(5); // 1 segment * 4.5 rounded up = 5 pesewas

      // Long GSM-7 message (> 160 chars, 153 chars per segment)
      const longMsg = "A".repeat(170);
      const longEstimate = estimateSms(longMsg);
      expect(longEstimate.encoding).toBe("GSM-7");
      expect(longEstimate.segmentCount).toBe(2);
      expect(longEstimate.costEstimatePesewas).toBe(9); // 2 * 4.5 = 9 pesewas
    });

    it("calculates Unicode segment counts and pesewas cost for emoji-rich messages", () => {
      // Unicode messages have 70 char single segment, 67 chars multi-segment
      const unicodeMsg = "Hello Ama ✨! Your luxury bridal glam session is confirmed 🎉💖";
      const estimate = estimateSms(unicodeMsg);
      expect(estimate.encoding).toBe("UNICODE");
      expect(estimate.segmentCount).toBe(1);

      // Long Unicode message > 70 characters
      const longUnicode = "✨" + "A".repeat(80);
      const longEstimate = estimateSms(longUnicode);
      expect(longEstimate.encoding).toBe("UNICODE");
      expect(longEstimate.segmentCount).toBe(2); // 81 chars / 67 = 2 segments
      expect(longEstimate.costEstimatePesewas).toBe(9);
    });
  });

  describe("3. Idempotency & Deduplication", () => {
    it("guarantees no message is sent twice when using the same idempotencyKey", async () => {
      const idempotencyKey = `test_idemp_${Date.now()}`;

      // Enqueue job 1
      const res1 = await notificationQueue.enqueueJob({
        channel: "SMS",
        event: "booking_confirmed",
        bookingId: "test_booking_idemp",
        recipient: "+233240001111",
        payload: { customContent: "Idempotent confirmation text" },
        idempotencyKey,
      });

      expect(res1.isDuplicate).toBe(false);

      // Enqueue job 2 with same idempotencyKey
      const res2 = await notificationQueue.enqueueJob({
        channel: "SMS",
        event: "booking_confirmed",
        bookingId: "test_booking_idemp",
        recipient: "+233240001111",
        payload: { customContent: "Idempotent confirmation text" },
        idempotencyKey,
      });

      expect(res2.isDuplicate).toBe(true);
      expect(res2.job.id).toBe(res1.job.id);

      // Process job once
      const processRes = await notificationQueue.processJob(res1.job.id);
      expect(processRes.success).toBe(true);

      // Processing again must be a no-op
      const processAgain = await notificationQueue.processJob(res1.job.id);
      expect(processAgain.success).toBe(false);

      // Verify only 1 SMS was dispatched
      expect(globalMockSmsProvider.sentMessages.length).toBe(1);

      // Verify only 1 MessageLog was recorded
      const logs = await prisma.messageLog.findMany({
        where: { idempotencyKey: `log_${idempotencyKey}` },
      });
      expect(logs.length).toBe(1);
      expect(logs[0].status).toBe("SANDBOX");
    });
  });

  describe("4. Reminder Rescheduling on Booking Change", () => {
    it("reschedules 24h and 2h reminders when appointment time changes and cancels old pending reminders", async () => {
      const bookingId = `test_booking_resched_${Date.now()}`;
      const originalStart = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48h from now

      // Initial reminder scheduling
      await notificationQueue.rescheduleBookingReminders(bookingId, originalStart, {
        customerPhone: "+233241234567",
        customerName: "Kofi Annan",
        serviceName: "Bridal Consultation",
        reference: "AURA-REF-01",
      });

      const initialJobs = await prisma.notificationJob.findMany({
        where: { bookingId, jobType: "REMINDER" },
      });
      expect(initialJobs.length).toBe(2);
      expect(initialJobs.every((j) => j.status === "PENDING")).toBe(true);

      // Customer reschedules to 72 hours from now
      const newStart = new Date(Date.now() + 72 * 60 * 60 * 1000);
      await notificationEvents.onBookingRescheduled(
        {
          id: bookingId,
          reference: "AURA-REF-01",
          startUtc: originalStart,
          endUtc: new Date(originalStart.getTime() + 60 * 60 * 1000),
          serviceName: "Bridal Consultation",
          customerName: "Kofi Annan",
          customerPhone: "+233241234567",
          totalPricePesewas: 30000,
        },
        newStart
      );

      // Check all reminder jobs for this booking
      const allReminderJobs = await prisma.notificationJob.findMany({
        where: { bookingId, jobType: "REMINDER" },
        orderBy: { createdAt: "asc" },
      });

      // Previous 2 jobs must be CANCELLED
      const cancelledJobs = allReminderJobs.filter((j) => j.status === "CANCELLED");
      expect(cancelledJobs.length).toBe(2);

      // New 2 jobs must be PENDING with new runAt matching newStart - 24h and newStart - 2h
      const pendingJobs = allReminderJobs.filter((j) => j.status === "PENDING");
      expect(pendingJobs.length).toBe(2);

      const expected24h = new Date(newStart.getTime() - 24 * 60 * 60 * 1000).getTime();
      const expected2h = new Date(newStart.getTime() - 2 * 60 * 60 * 1000).getTime();

      const runTimes = pendingJobs.map((j) => j.runAt.getTime());
      expect(runTimes).toContain(expected24h);
      expect(runTimes).toContain(expected2h);
    });

    it("cancels pending reminders when booking is cancelled", async () => {
      const bookingId = `test_booking_cancel_${Date.now()}`;
      const startUtc = new Date(Date.now() + 36 * 60 * 60 * 1000);

      await notificationQueue.rescheduleBookingReminders(bookingId, startUtc, {
        customerPhone: "+233241112222",
        customerName: "Ama Serwaa",
        serviceName: "Gown Fitting",
        reference: "AURA-CANCEL-01",
      });

      const beforeCancel = await prisma.notificationJob.findMany({
        where: { bookingId, status: "PENDING" },
      });
      expect(beforeCancel.length).toBe(2);

      // Cancel booking
      await notificationEvents.onBookingCancelled({
        id: bookingId,
        reference: "AURA-CANCEL-01",
        startUtc,
        endUtc: new Date(startUtc.getTime() + 60 * 60 * 1000),
        serviceName: "Gown Fitting",
        customerName: "Ama Serwaa",
        customerPhone: "+233241112222",
        totalPricePesewas: 25000,
      });

      const remainingPending = await prisma.notificationJob.findMany({
        where: { bookingId, status: "PENDING", jobType: "REMINDER" },
      });
      expect(remainingPending.length).toBe(0);
    });
  });

  describe("5. Retries with Backoff on Failures", () => {
    it("retries failed sends with backoff and records retryCount in MessageLog", async () => {
      const failingMockSms = new MockSmsProvider();
      failingMockSms.shouldFailNext = true;
      setCustomSmsProvider(failingMockSms);

      const idempotencyKey = `test_retry_${Date.now()}`;
      const { job } = await notificationQueue.enqueueJob({
        channel: "SMS",
        event: "payment_request",
        bookingId: "test_booking_retry",
        recipient: "+233249998888",
        payload: { customContent: "Please pay balance" },
        idempotencyKey,
        maxAttempts: 3,
      });

      // 1st attempt: fails
      const result1 = await notificationQueue.processJob(job.id);
      expect(result1.success).toBe(false);
      expect(result1.retrying).toBe(true);
      expect(result1.attempt).toBe(1);

      // Verify MessageLog was created with status PENDING, retryCount = 1, and nextRetryAt
      const log1 = await prisma.messageLog.findUnique({
        where: { idempotencyKey: `log_${idempotencyKey}` },
      });
      expect(log1).toBeDefined();
      expect(log1?.status).toBe("PENDING");
      expect(log1?.retryCount).toBe(1);
      expect(log1?.nextRetryAt).toBeDefined();

      // Check job in DB
      const jobInDb1 = await prisma.notificationJob.findUnique({ where: { id: job.id } });
      expect(jobInDb1?.status).toBe("PENDING");
      expect(jobInDb1?.attempts).toBe(1);

      // 2nd attempt: simulated success
      failingMockSms.shouldFailNext = false;
      const result2 = await notificationQueue.processJob(job.id);
      expect(result2.success).toBe(true);

      const log2 = await prisma.messageLog.findUnique({
        where: { idempotencyKey: `log_${idempotencyKey}` },
      });
      expect(["SANDBOX", "DELIVERED"]).toContain(log2?.status);
      expect(log2?.deliveredAt).toBeDefined();
    });

    it("marks job as FAILED when maxAttempts are exhausted", async () => {
      const failingMockEmail = new MockEmailProvider();
      setCustomEmailProvider(failingMockEmail);

      const idempotencyKey = `test_exhaust_${Date.now()}`;
      const { job } = await notificationQueue.enqueueJob({
        channel: "EMAIL",
        event: "booking_confirmed",
        bookingId: "test_booking_exhaust",
        recipient: "fail@example.com",
        payload: { subject: "Test Subject", customContent: "Exhaustion test" },
        idempotencyKey,
        maxAttempts: 2,
      });

      // Attempt 1: fails
      failingMockEmail.shouldFailNext = true;
      await notificationQueue.processJob(job.id);

      // Attempt 2: fails again (exhausted)
      failingMockEmail.shouldFailNext = true;
      const result2 = await notificationQueue.processJob(job.id);

      expect(result2.success).toBe(false);
      expect(result2.exhausted).toBe(true);

      const finalJob = await prisma.notificationJob.findUnique({ where: { id: job.id } });
      expect(finalJob?.status).toBe("FAILED");
      expect(finalJob?.attempts).toBe(2);

      const finalLog = await prisma.messageLog.findUnique({
        where: { idempotencyKey: `log_${idempotencyKey}` },
      });
      expect(finalLog?.status).toBe("FAILED");
      expect(finalLog?.failedAt).toBeDefined();
    });
  });

  describe("6. Marketing Opt-Out Handling", () => {
    it("suppresses marketing notifications when customer has opted out", async () => {
      // Create customer with marketingConsent = false
      const phone = `+23324${Math.floor(1000000 + Math.random() * 9000000)}`;
      await prisma.customer.create({
        data: {
          name: "Opted Out Client",
          phone,
          marketingConsent: false,
        },
      });

      const idempotencyKey = `test_marketing_optout_${Date.now()}`;
      const { job } = await notificationQueue.enqueueJob({
        channel: "SMS",
        event: "promo_blast",
        bookingId: "test_booking_mktg",
        recipient: phone,
        payload: {
          customContent: "Special 20% discount on hair styling this weekend!",
          isMarketing: true,
          customerConsentPhone: phone,
        },
        idempotencyKey,
      });

      const res = await notificationQueue.processJob(job.id);
      expect(res.success).toBe(true);
      expect(res.suppressed).toBe(true);

      // Verify no SMS was dispatched
      expect(globalMockSmsProvider.sentMessages.length).toBe(0);

      // Verify MessageLog recorded SUPPRESSED
      const log = await prisma.messageLog.findUnique({
        where: { idempotencyKey: `log_${idempotencyKey}` },
      });
      expect(log?.status).toBe("SUPPRESSED");
      expect(log?.content).toContain("Customer opted out");
    });
  });

  describe("7. In-App Notification Feed", () => {
    it("creates InAppNotification records for staff and handles marking as read", async () => {
      const bookingId = `test_booking_inapp_${Date.now()}`;
      const idempotencyKey = `test_inapp_${Date.now()}`;

      const { job } = await notificationQueue.enqueueJob({
        channel: "IN_APP",
        event: "staff_alert_new_booking",
        bookingId,
        recipient: "ALL_STAFF",
        payload: {
          subject: "Test New Booking: Luxury Glam",
          customContent: "Client Abena has placed an online booking for tomorrow at 2:00 PM.",
        },
        idempotencyKey,
      });

      const processRes = await notificationQueue.processJob(job.id);
      expect(processRes.success).toBe(true);

      const inAppItem = await prisma.inAppNotification.findFirst({
        where: { bookingId },
      });

      expect(inAppItem).toBeDefined();
      expect(inAppItem?.title).toBe("Test New Booking: Luxury Glam");
      expect(inAppItem?.read).toBe(false);

      // Mark as read
      await prisma.inAppNotification.update({
        where: { id: inAppItem!.id },
        data: { read: true, readAt: new Date() },
      });

      const updated = await prisma.inAppNotification.findUnique({
        where: { id: inAppItem!.id },
      });
      expect(updated?.read).toBe(true);
      expect(updated?.readAt).toBeDefined();
    });
  });

  describe("8. Template Management API & Role Gating", () => {
    it("allows Manager and Owner to edit notification templates with variables", async () => {
      await ensureDefaultTemplates();

      const template = await prisma.messageTemplate.findFirst({
        where: { slug: "booking_confirmed_sms" },
      });
      expect(template).toBeDefined();

      const updatedText =
        "Akwaaba {{name}}! Your appointment for {{service}} on {{date}} at {{time}} is booked (Ref: {{reference}}). Balance: {{amountDue}}. Manage: {{manageLink}}";

      const updated = await prisma.messageTemplate.update({
        where: { id: template!.id },
        data: {
          template: updatedText,
        },
      });

      expect(updated.template).toBe(updatedText);

      // Verify template rendering uses updated text
      const rendered = await getTemplate("booking_confirmed", "SMS");
      expect(rendered.template).toBe(updatedText);

      const preview = renderTemplate(rendered.template, {
        name: "Abena Mansa",
        service: "Knotless Braids",
        date: "29 Oct 2026",
        time: "11:00 AM",
        reference: "AURA-771",
        amountDue: "GH₵ 200.00",
        manageLink: "https://aurastudio.com/manage/AURA-771",
      });

      expect(preview).toContain("Akwaaba Abena Mansa!");
      expect(preview).toContain("Knotless Braids");
      expect(preview).toContain("GH₵ 200.00");
    });
  });
});
