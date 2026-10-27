import { prisma } from "../db";
import { getSmsProvider, getEmailProvider, isSandboxMode } from "./providers/factory";
import { renderNotificationMessage } from "./template-service";
import { estimateSms } from "./utils";
import { NotificationChannel, TemplateVariables, ProcessJobResult } from "./types";
import { logger } from "../logger";

export interface EnqueueJobOptions {
  jobType?: "NOTIFICATION" | "REMINDER";
  channel: NotificationChannel;
  event: string;
  bookingId?: string;
  recipient: string; // phone, email, or userId
  payload: {
    variables?: TemplateVariables;
    isMarketing?: boolean;
    subject?: string;
    customContent?: string;
    customerConsentPhone?: string; // used to lookup customer opt-out if applicable
    [key: string]: unknown;
  };
  runAt?: Date;
  idempotencyKey: string;
  maxAttempts?: number;
}

export class NotificationQueue {
  /**
   * Enqueues a notification or reminder job with strict idempotency.
   * If a job with the same idempotency key already exists, returns the existing job.
   */
  async enqueueJob(options: EnqueueJobOptions) {
    const {
      jobType = "NOTIFICATION",
      channel,
      event,
      bookingId,
      recipient,
      payload,
      runAt = new Date(),
      idempotencyKey,
      maxAttempts = 3,
    } = options;

    // Check existing job for idempotency
    const existing = await prisma.notificationJob.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      logger.info(`[NotificationQueue] Idempotency hit: job already exists with key ${idempotencyKey}`, {
        jobId: existing.id,
        status: existing.status,
      });
      return { job: existing, isDuplicate: true };
    }

    try {
      const job = await prisma.notificationJob.create({
        data: {
          jobType,
          channel,
          event,
          bookingId,
          recipient,
          payload: payload as object,
          runAt,
          idempotencyKey,
          maxAttempts,
          status: "PENDING",
        },
      });

      return { job, isDuplicate: false };
    } catch (err: unknown) {
      // Handle potential race condition on unique idempotencyKey
      const duplicate = await prisma.notificationJob.findUnique({
        where: { idempotencyKey },
      });
      if (duplicate) {
        return { job: duplicate, isDuplicate: true };
      }
      throw err;
    }
  }

  /**
   * Reschedules 24h and 2h reminders for a booking when its appointment time changes.
   */
  async rescheduleBookingReminders(
    bookingId: string,
    newStartUtc: Date,
    details: {
      customerPhone?: string;
      customerEmail?: string;
      customerName: string;
      serviceName: string;
      reference: string;
      amountDue?: string;
      manageLink?: string;
    }
  ) {
    // 1. Cancel existing pending reminder jobs for this booking
    await prisma.notificationJob.updateMany({
      where: {
        bookingId,
        jobType: "REMINDER",
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });

    const now = new Date();
    const reminder24hTime = new Date(newStartUtc.getTime() - 24 * 60 * 60 * 1000);
    const reminder2hTime = new Date(newStartUtc.getTime() - 2 * 60 * 60 * 1000);

    const results = [];

    // Format Accra time
    const dateFormatted = newStartUtc.toLocaleDateString("en-GB", {
      timeZone: "Africa/Accra",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = newStartUtc.toLocaleTimeString("en-GB", {
      timeZone: "Africa/Accra",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    const variables: TemplateVariables = {
      name: details.customerName,
      service: details.serviceName,
      date: dateFormatted,
      time: timeFormatted,
      reference: details.reference,
      amountDue: details.amountDue || "GHS 0.00",
      manageLink: details.manageLink || `https://aurastudio.com/manage/${details.reference}`,
    };

    // Schedule 24h reminder if future
    if (details.customerPhone && reminder24hTime > now) {
      const job24h = await this.enqueueJob({
        jobType: "REMINDER",
        channel: "SMS",
        event: "reminder_24h",
        bookingId,
        recipient: details.customerPhone,
        payload: { variables },
        runAt: reminder24hTime,
        // Include new start time in idempotency key to differentiate rescheduled appointments
        idempotencyKey: `rem_24h_${bookingId}_${newStartUtc.getTime()}_sms`,
      });
      results.push(job24h);
    }

    // Schedule 2h reminder if future
    if (details.customerPhone && reminder2hTime > now) {
      const job2h = await this.enqueueJob({
        jobType: "REMINDER",
        channel: "SMS",
        event: "reminder_2h",
        bookingId,
        recipient: details.customerPhone,
        payload: { variables },
        runAt: reminder2hTime,
        idempotencyKey: `rem_2h_${bookingId}_${newStartUtc.getTime()}_sms`,
      });
      results.push(job2h);
    }

    return results;
  }

  /**
   * Cancels all pending notifications for a cancelled booking.
   */
  async cancelBookingNotifications(bookingId: string) {
    return prisma.notificationJob.updateMany({
      where: {
        bookingId,
        status: "PENDING",
      },
      data: {
        status: "CANCELLED",
      },
    });
  }

  /**
   * Processes an individual job. Handles provider calls, retries with backoff, MessageLog logging,
   * SMS estimation, and marketing consent check.
   */
  async processJob(jobId: string): Promise<ProcessJobResult> {
    const job = await prisma.notificationJob.findUnique({
      where: { id: jobId },
    });

    if (!job || job.status === "COMPLETED" || job.status === "CANCELLED") {
      return { success: false, reason: "Job not eligible for processing" };
    }

    // Mark as PROCESSING
    await prisma.notificationJob.update({
      where: { id: jobId },
      data: { status: "PROCESSING" },
    });

    const payload = (job.payload || {}) as {
      variables?: TemplateVariables;
      isMarketing?: boolean;
      subject?: string;
      customContent?: string;
      customerConsentPhone?: string;
    };

    const variables = payload.variables || {};
    const sandbox = await isSandboxMode();

    // 1. Marketing Opt-out Handling
    if (payload.isMarketing) {
      let isOptedOut = false;
      const lookupPhone = payload.customerConsentPhone || job.recipient;
      if (lookupPhone) {
        const customer = await prisma.customer.findFirst({
          where: {
            phone: { contains: lookupPhone.replace(/\D/g, "").slice(-9) },
          },
        });
        if (customer && customer.marketingConsent === false) {
          isOptedOut = true;
        }
      }

      if (isOptedOut) {
        logger.info(`[NotificationQueue] Marketing message suppressed: Customer opted out`, {
          recipient: job.recipient,
          event: job.event,
        });

        await prisma.messageLog.create({
          data: {
            recipient: job.recipient,
            channel: job.channel,
            event: job.event,
            content: "[SUPPRESSED: Customer opted out of marketing communications]",
            status: "SUPPRESSED",
            bookingId: job.bookingId,
            idempotencyKey: `log_${job.idempotencyKey}`,
          },
        });

        await prisma.notificationJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            processedAt: new Date(),
          },
        });

        return { success: true, suppressed: true, reason: "Customer opted out of marketing" };
      }
    }

    // 2. Render Template or Content
    let content = payload.customContent || "";
    let subject = payload.subject;

    if (!content && (job.channel === "SMS" || job.channel === "EMAIL")) {
      const rendered = await renderNotificationMessage(job.event, job.channel, variables);
      content = rendered.content;
      subject = subject || rendered.subject;
    }

    // 3. Estimate SMS length and Unicode cost if SMS
    let estimate = undefined;
    if (job.channel === "SMS") {
      estimate = estimateSms(content);
    }

    // 4. In-App Notification Handling
    if (job.channel === "IN_APP") {
      try {
        await prisma.inAppNotification.create({
          data: {
            userId: job.recipient === "ALL_STAFF" ? null : job.recipient,
            title: subject || `Notification: ${job.event}`,
            message: content || (variables.name ? `New update for ${variables.name}` : "New booking update"),
            type: job.event.includes("cancel") ? "WARNING" : "BOOKING",
            bookingId: job.bookingId,
            link: job.bookingId ? `/admin/calendar?bookingId=${job.bookingId}` : undefined,
          },
        });

        await prisma.notificationJob.update({
          where: { id: jobId },
          data: { status: "COMPLETED", processedAt: new Date() },
        });

        return { success: true, channel: "IN_APP" };
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        await this.handleJobFailure(job, errorMsg);
        return { success: false, error: errorMsg };
      }
    }

    // 5. Send via Provider (SMS or EMAIL)
    let sendResult: { success: boolean; gatewayMessageId?: string; error?: string };

    if (job.channel === "SMS") {
      const smsProvider = await getSmsProvider();
      sendResult = await smsProvider.sendSms({
        recipient: job.recipient,
        message: content,
        senderId: "Glamour",
        idempotencyKey: job.idempotencyKey,
      });
    } else {
      const emailProvider = await getEmailProvider();
      sendResult = await emailProvider.sendEmail({
        to: job.recipient,
        subject: subject || "Aura Studio Notification",
        text: content.replace(/<[^>]+>/g, ""),
        html: content,
        idempotencyKey: job.idempotencyKey,
      });
    }

    if (sendResult.success) {
      // Record successful delivery in MessageLog (upsert in case previously created during retry)
      await prisma.messageLog.upsert({
        where: { idempotencyKey: `log_${job.idempotencyKey}` },
        create: {
          recipient: job.recipient,
          channel: job.channel,
          event: job.event,
          subject,
          content,
          status: sandbox ? "SANDBOX" : "DELIVERED",
          gatewayId: sendResult.gatewayMessageId,
          bookingId: job.bookingId,
          idempotencyKey: `log_${job.idempotencyKey}`,
          costEstimatePesewas: estimate?.costEstimatePesewas,
          segmentCount: estimate?.segmentCount,
          encoding: estimate?.encoding,
          deliveredAt: new Date(),
        },
        update: {
          status: sandbox ? "SANDBOX" : "DELIVERED",
          gatewayId: sendResult.gatewayMessageId,
          deliveredAt: new Date(),
          error: null,
        },
      });

      // Mark Job as COMPLETED
      await prisma.notificationJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          processedAt: new Date(),
        },
      });

      return {
        success: true,
        gatewayId: sendResult.gatewayMessageId,
        estimate,
      };
    } else {
      // Failure with Retry Backoff
      const errorMsg = sendResult.error || "Unknown provider send failure";
      return await this.handleJobFailure(job, errorMsg, { content, subject, estimate });
    }
  }

  /**
   * Handles failure and applies exponential backoff or marks as failed.
   */
  private async handleJobFailure(
    job: {
      id: string;
      attempts: number;
      maxAttempts: number;
      channel: string;
      event: string;
      recipient: string;
      bookingId: string | null;
      idempotencyKey: string;
    },
    errorMsg: string,
    context?: {
      content?: string;
      subject?: string;
      estimate?: { costEstimatePesewas: number; segmentCount: number; encoding: "GSM-7" | "UNICODE" };
    }
  ): Promise<ProcessJobResult> {
    const nextAttempt = job.attempts + 1;
    const isExhausted = nextAttempt >= job.maxAttempts;

    if (!isExhausted) {
      // Exponential backoff: 2s, 4s, 8s, 16s...
      const backoffMs = Math.pow(2, nextAttempt) * 1000;
      const nextRetryAt = new Date(Date.now() + backoffMs);

      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "PENDING",
          attempts: nextAttempt,
          runAt: nextRetryAt,
          lastError: errorMsg,
        },
      });

      // Upsert or create MessageLog for tracking retry progress
      await prisma.messageLog.upsert({
        where: { idempotencyKey: `log_${job.idempotencyKey}` },
        create: {
          recipient: job.recipient,
          channel: job.channel,
          event: job.event,
          subject: context?.subject,
          content: context?.content || "Pending delivery",
          status: "PENDING",
          bookingId: job.bookingId,
          idempotencyKey: `log_${job.idempotencyKey}`,
          retryCount: nextAttempt,
          maxRetries: job.maxAttempts,
          nextRetryAt,
          error: errorMsg,
          costEstimatePesewas: context?.estimate?.costEstimatePesewas,
          segmentCount: context?.estimate?.segmentCount,
          encoding: context?.estimate?.encoding,
        },
        update: {
          status: "PENDING",
          retryCount: nextAttempt,
          nextRetryAt,
          error: errorMsg,
        },
      });

      logger.warn(`[NotificationQueue] Job ${job.id} failed attempt ${nextAttempt}/${job.maxAttempts}. Retrying in ${backoffMs}ms`, {
        error: errorMsg,
      });

      return {
        success: false,
        retrying: true,
        attempt: nextAttempt,
        nextRetryAt,
        error: errorMsg,
      };
    } else {
      // Max attempts exhausted, mark FAILED
      await prisma.notificationJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          attempts: nextAttempt,
          lastError: errorMsg,
          processedAt: new Date(),
        },
      });

      await prisma.messageLog.upsert({
        where: { idempotencyKey: `log_${job.idempotencyKey}` },
        create: {
          recipient: job.recipient,
          channel: job.channel,
          event: job.event,
          subject: context?.subject,
          content: context?.content || "Delivery failed",
          status: "FAILED",
          bookingId: job.bookingId,
          idempotencyKey: `log_${job.idempotencyKey}`,
          retryCount: nextAttempt,
          maxRetries: job.maxAttempts,
          failedAt: new Date(),
          error: errorMsg,
        },
        update: {
          status: "FAILED",
          retryCount: nextAttempt,
          failedAt: new Date(),
          error: errorMsg,
        },
      });

      logger.error(`[NotificationQueue] Job ${job.id} permanently failed after ${nextAttempt} attempts`, {
        error: errorMsg,
      });

      return {
        success: false,
        retrying: false,
        attempt: nextAttempt,
        exhausted: true,
        error: errorMsg,
      };
    }
  }

  /**
   * Processes all pending jobs scheduled to run at or before current time.
   */
  async processPendingJobs(limit = 20) {
    const pendingJobs = await prisma.notificationJob.findMany({
      where: {
        status: "PENDING",
        runAt: { lte: new Date() },
      },
      orderBy: { runAt: "asc" },
      take: limit,
    });

    const results = [];
    for (const job of pendingJobs) {
      const res = await this.processJob(job.id);
      results.push({ jobId: job.id, ...res });
    }

    return {
      processedCount: pendingJobs.length,
      results,
    };
  }
}

export const notificationQueue = new NotificationQueue();
