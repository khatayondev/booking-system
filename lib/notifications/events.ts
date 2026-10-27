import { notificationQueue } from "./queue";
import { formatPesewas } from "../money";
import { TemplateVariables } from "./types";

export interface BookingEventData {
  id: string;
  reference: string;
  startUtc: Date;
  endUtc: Date;
  serviceId?: string;
  serviceName: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  staffName?: string;
  staffPhone?: string;
  staffEmail?: string;
  totalPricePesewas: number;
  amountPaidPesewas?: number;
  balanceDuePesewas?: number;
  notes?: string;
}

export class NotificationEvents {
  /**
   * Helper to format Accra date & time.
   */
  private formatDateAndTime(date: Date) {
    const dateFormatted = date.toLocaleDateString("en-GB", {
      timeZone: "Africa/Accra",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timeFormatted = date.toLocaleTimeString("en-GB", {
      timeZone: "Africa/Accra",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
    return { dateFormatted, timeFormatted };
  }

  /**
   * Event: Booking Confirmed
   * - Enqueues confirmation SMS / Email to customer.
   * - Schedules 24h & 2h reminders.
   * - Sends in-app and staff alert for new bookings.
   */
  async onBookingConfirmed(booking: BookingEventData) {
    const { dateFormatted, timeFormatted } = this.formatDateAndTime(booking.startUtc);
    const amountDue = formatPesewas(booking.balanceDuePesewas ?? (booking.totalPricePesewas - (booking.amountPaidPesewas || 0)));
    const manageLink = `https://aurastudio.com/manage/${booking.reference}`;

    const variables: TemplateVariables = {
      name: booking.customerName,
      service: booking.serviceName,
      date: dateFormatted,
      time: timeFormatted,
      reference: booking.reference,
      amountDue,
      manageLink,
      businessName: "Aura Beauty Studio",
      staffName: booking.staffName || "Our Glamour Team",
    };

    const jobs = [];

    // 1. Customer Confirmation SMS
    if (booking.customerPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "booking_confirmed",
          bookingId: booking.id,
          recipient: booking.customerPhone,
          payload: { variables },
          idempotencyKey: `confirmed_sms_${booking.id}_${booking.reference}`,
        })
      );
    }

    // 2. Customer Confirmation Email
    if (booking.customerEmail) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "EMAIL",
          event: "booking_confirmed",
          bookingId: booking.id,
          recipient: booking.customerEmail,
          payload: { variables },
          idempotencyKey: `confirmed_email_${booking.id}_${booking.reference}`,
        })
      );
    }

    // 3. Schedule 24h and 2h Reminders
    await notificationQueue.rescheduleBookingReminders(booking.id, booking.startUtc, {
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      reference: booking.reference,
      amountDue,
      manageLink,
    });

    // 4. Staff/Owner Alert for new booking (In-App + Notification)
    await this.onStaffNewBookingAlert(booking);

    return Promise.all(jobs);
  }

  /**
   * Event: Payment Received
   */
  async onPaymentReceived(
    booking: BookingEventData,
    payment: { amountPesewas: number; method: string; reference?: string }
  ) {
    const amountPaid = formatPesewas(payment.amountPesewas);
    const remainingBalance = Math.max(0, booking.totalPricePesewas - ((booking.amountPaidPesewas || 0) + payment.amountPesewas));
    const amountDue = formatPesewas(remainingBalance);
    const manageLink = `https://aurastudio.com/manage/${booking.reference}`;

    const variables: TemplateVariables = {
      name: booking.customerName,
      amountPaid,
      amountDue,
      reference: booking.reference,
      service: booking.serviceName,
      manageLink,
      businessName: "Aura Beauty Studio",
    };

    const jobs = [];
    if (booking.customerPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "payment_received",
          bookingId: booking.id,
          recipient: booking.customerPhone,
          payload: { variables },
          idempotencyKey: `pay_rcvd_sms_${booking.id}_${payment.reference || Date.now()}`,
        })
      );
    }

    if (booking.customerEmail) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "EMAIL",
          event: "payment_received",
          bookingId: booking.id,
          recipient: booking.customerEmail,
          payload: { variables },
          idempotencyKey: `pay_rcvd_email_${booking.id}_${payment.reference || Date.now()}`,
        })
      );
    }

    return Promise.all(jobs);
  }

  /**
   * Event: Payment Request
   */
  async onPaymentRequest(booking: BookingEventData, amountDuePesewas: number) {
    const amountDue = formatPesewas(amountDuePesewas);
    const manageLink = `https://aurastudio.com/manage/${booking.reference}/pay`;

    const variables: TemplateVariables = {
      name: booking.customerName,
      amountDue,
      service: booking.serviceName,
      reference: booking.reference,
      manageLink,
      businessName: "Aura Beauty Studio",
    };

    const jobs = [];
    if (booking.customerPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "payment_request",
          bookingId: booking.id,
          recipient: booking.customerPhone,
          payload: { variables },
          idempotencyKey: `pay_req_sms_${booking.id}_${amountDuePesewas}`,
        })
      );
    }

    if (booking.customerEmail) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "EMAIL",
          event: "payment_request",
          bookingId: booking.id,
          recipient: booking.customerEmail,
          payload: { variables },
          idempotencyKey: `pay_req_email_${booking.id}_${amountDuePesewas}`,
        })
      );
    }

    return Promise.all(jobs);
  }

  /**
   * Event: Reschedule
   */
  async onBookingRescheduled(booking: BookingEventData, newStartUtc: Date) {
    const { dateFormatted, timeFormatted } = this.formatDateAndTime(newStartUtc);
    const manageLink = `https://aurastudio.com/manage/${booking.reference}`;
    const amountDue = formatPesewas(booking.balanceDuePesewas ?? (booking.totalPricePesewas - (booking.amountPaidPesewas || 0)));

    const variables: TemplateVariables = {
      name: booking.customerName,
      reference: booking.reference,
      date: dateFormatted,
      time: timeFormatted,
      service: booking.serviceName,
      manageLink,
      amountDue,
      businessName: "Aura Beauty Studio",
    };

    // 1. Reschedule reminders
    await notificationQueue.rescheduleBookingReminders(booking.id, newStartUtc, {
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      customerName: booking.customerName,
      serviceName: booking.serviceName,
      reference: booking.reference,
      amountDue,
      manageLink,
    });

    const jobs = [];
    // 2. Customer Notification SMS
    if (booking.customerPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "booking_rescheduled",
          bookingId: booking.id,
          recipient: booking.customerPhone,
          payload: { variables },
          idempotencyKey: `resched_sms_${booking.id}_${newStartUtc.getTime()}`,
        })
      );
    }

    // 3. Customer Notification Email
    if (booking.customerEmail) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "EMAIL",
          event: "booking_rescheduled",
          bookingId: booking.id,
          recipient: booking.customerEmail,
          payload: { variables },
          idempotencyKey: `resched_email_${booking.id}_${newStartUtc.getTime()}`,
        })
      );
    }

    // 4. In-App Notification
    jobs.push(
      notificationQueue.enqueueJob({
        channel: "IN_APP",
        event: "booking_rescheduled",
        bookingId: booking.id,
        recipient: "ALL_STAFF",
        payload: {
          subject: `Booking Rescheduled: ${booking.customerName}`,
          customContent: `${booking.customerName} has rescheduled ${booking.serviceName} to ${dateFormatted} at ${timeFormatted}.`,
        },
        idempotencyKey: `inapp_resched_${booking.id}_${newStartUtc.getTime()}`,
      })
    );

    return Promise.all(jobs);
  }

  /**
   * Event: Cancellation
   */
  async onBookingCancelled(booking: BookingEventData, reason?: string) {
    const { dateFormatted, timeFormatted } = this.formatDateAndTime(booking.startUtc);
    const manageLink = `https://aurastudio.com/manage/${booking.reference}`;

    const variables: TemplateVariables = {
      name: booking.customerName,
      reference: booking.reference,
      service: booking.serviceName,
      date: dateFormatted,
      time: timeFormatted,
      manageLink,
      businessName: "Aura Beauty Studio",
    };

    // 1. Cancel pending reminder jobs
    await notificationQueue.cancelBookingNotifications(booking.id);

    const jobs = [];
    if (booking.customerPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "booking_cancelled",
          bookingId: booking.id,
          recipient: booking.customerPhone,
          payload: { variables },
          idempotencyKey: `cancel_sms_${booking.id}`,
        })
      );
    }

    if (booking.customerEmail) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "EMAIL",
          event: "booking_cancelled",
          bookingId: booking.id,
          recipient: booking.customerEmail,
          payload: { variables },
          idempotencyKey: `cancel_email_${booking.id}`,
        })
      );
    }

    // In-App Notification
    jobs.push(
      notificationQueue.enqueueJob({
        channel: "IN_APP",
        event: "booking_cancelled",
        bookingId: booking.id,
        recipient: "ALL_STAFF",
        payload: {
          subject: `Booking Cancelled: ${booking.reference}`,
          customContent: `Booking ${booking.reference} for ${booking.customerName} (${booking.serviceName}) has been cancelled.${reason ? ` Reason: ${reason}` : ""}`,
        },
        idempotencyKey: `inapp_cancel_${booking.id}`,
      })
    );

    return Promise.all(jobs);
  }

  /**
   * Event: Refund Issued
   */
  async onRefundIssued(booking: BookingEventData, refundAmountPesewas: number) {
    const refundAmount = formatPesewas(refundAmountPesewas);
    const manageLink = `https://aurastudio.com/manage/${booking.reference}`;

    const variables: TemplateVariables = {
      name: booking.customerName,
      refundAmount,
      reference: booking.reference,
      service: booking.serviceName,
      manageLink,
      businessName: "Aura Beauty Studio",
    };

    const jobs = [];
    if (booking.customerPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "refund_issued",
          bookingId: booking.id,
          recipient: booking.customerPhone,
          payload: { variables },
          idempotencyKey: `refund_sms_${booking.id}_${refundAmountPesewas}`,
        })
      );
    }

    if (booking.customerEmail) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "EMAIL",
          event: "refund_issued",
          bookingId: booking.id,
          recipient: booking.customerEmail,
          payload: { variables },
          idempotencyKey: `refund_email_${booking.id}_${refundAmountPesewas}`,
        })
      );
    }

    return Promise.all(jobs);
  }

  /**
   * Event: No-Show Follow-up
   */
  async onNoShowFollowup(booking: BookingEventData) {
    const manageLink = `https://aurastudio.com/book`;

    const variables: TemplateVariables = {
      name: booking.customerName,
      service: booking.serviceName,
      reference: booking.reference,
      manageLink,
      businessName: "Aura Beauty Studio",
    };

    const jobs = [];
    if (booking.customerPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "no_show_followup",
          bookingId: booking.id,
          recipient: booking.customerPhone,
          payload: { variables, isMarketing: false },
          idempotencyKey: `noshow_sms_${booking.id}`,
        })
      );
    }

    if (booking.customerEmail) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "EMAIL",
          event: "no_show_followup",
          bookingId: booking.id,
          recipient: booking.customerEmail,
          payload: { variables, isMarketing: false },
          idempotencyKey: `noshow_email_${booking.id}`,
        })
      );
    }

    return Promise.all(jobs);
  }

  /**
   * Event: Staff or Owner Alert for New Web Booking
   */
  async onStaffNewBookingAlert(booking: BookingEventData) {
    const { dateFormatted, timeFormatted } = this.formatDateAndTime(booking.startUtc);

    const variables: TemplateVariables = {
      name: booking.customerName,
      service: booking.serviceName,
      date: dateFormatted,
      time: timeFormatted,
      reference: booking.reference,
      staffName: booking.staffName || "Unassigned",
    };

    const jobs = [];

    // In-App Notification (Visible to all staff in notification centre)
    jobs.push(
      notificationQueue.enqueueJob({
        channel: "IN_APP",
        event: "staff_alert_new_booking",
        bookingId: booking.id,
        recipient: "ALL_STAFF",
        payload: {
          subject: `New Web Booking: ${booking.serviceName}`,
          customContent: `${booking.customerName} booked ${booking.serviceName} for ${dateFormatted} at ${timeFormatted} (Ref: ${booking.reference}).`,
        },
        idempotencyKey: `inapp_new_booking_${booking.id}`,
      })
    );

    // Optional direct SMS to assigned staff if mobile phone configured
    if (booking.staffPhone) {
      jobs.push(
        notificationQueue.enqueueJob({
          channel: "SMS",
          event: "staff_alert_new_booking",
          bookingId: booking.id,
          recipient: booking.staffPhone,
          payload: { variables },
          idempotencyKey: `staff_sms_${booking.id}_${booking.staffPhone}`,
        })
      );
    }

    return Promise.all(jobs);
  }
}

export const notificationEvents = new NotificationEvents();
