import { wrapLuxuryEmailHtml, buildMasterEmailHTML } from "./base-layout";

export { buildMasterEmailHTML };

export interface BookingConfirmationEmailParams {
  customerName: string;
  serviceName: string;
  dateFormatted: string;
  timeFormatted: string;
  reference: string;
  amountDue: string;
  staffName?: string;
  manageUrl: string;
}

export function buildBookingConfirmedEmail(params: BookingConfirmationEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Crown Reserved: ${params.serviceName} on ${params.dateFormatted} (Ref: ${params.reference})`;

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">Dear <strong>${params.customerName}</strong>,</p>
    <p style="margin: 0 0 14px 0;">
      Your appointment at <strong>Becca&apos;s Crown Beauty Vault</strong> has been confirmed. Our specialists look forward to giving you an unforgettable artistry experience.
    </p>
    <p style="margin: 0;">
      Please arrive 10 minutes prior to your scheduled time. If you need to make changes, you may reschedule free of charge up to 24 hours before your slot using your booking pass below.
    </p>
  `;

  const metaFields = [
    { label: "Booking Reference", value: params.reference },
    { label: "Treatment", value: params.serviceName },
    { label: "Date & Time", value: `${params.dateFormatted} at ${params.timeFormatted}` },
    ...(params.staffName ? [{ label: "Assigned Specialist", value: params.staffName }] : []),
    { label: "Balance Due at Studio", value: params.amountDue },
    { label: "Location", value: "Becca's Crown Beauty Vault, Ghana" },
  ];

  const html = wrapLuxuryEmailHtml({
    title: "Appointment Confirmed",
    badge: "VIP Slot Secured",
    preheader: `Your booking for ${params.serviceName} on ${params.dateFormatted} is confirmed!`,
    bodyHtml,
    metaFields,
    ctaText: "View Digital Booking Pass",
    ctaUrl: params.manageUrl,
  });

  const text = `
BECCA'S CROWN • BEAUTY VAULT
APPOINTMENT CONFIRMED

Dear ${params.customerName},
Your appointment for ${params.serviceName} on ${params.dateFormatted} at ${params.timeFormatted} is confirmed.

Reference: ${params.reference}
Balance Due: ${params.amountDue}
Location: Becca's Crown Beauty Vault, Ghana

Manage your appointment: ${params.manageUrl}
  `.trim();

  return { subject, html, text };
}

export interface PaymentReceiptEmailParams {
  customerName: string;
  serviceName: string;
  amountPaid: string;
  balanceRemaining: string;
  reference: string;
  paymentMethod: string;
  manageUrl: string;
}

export function buildPaymentReceiptEmail(params: PaymentReceiptEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Payment Received: ${params.amountPaid} for Booking ${params.reference}`;

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">Hello <strong>${params.customerName}</strong>,</p>
    <p style="margin: 0 0 14px 0;">
      Thank you! We have received your payment of <strong style="color: #F59E0B;">${params.amountPaid}</strong>.
    </p>
    <p style="margin: 0;">
      Your payment has been reconciled and credited to your appointment. A copy of your digital receipt is saved in your self-service portal.
    </p>
  `;

  const metaFields = [
    { label: "Payment Reference", value: params.reference },
    { label: "Treatment", value: params.serviceName },
    { label: "Amount Paid", value: params.amountPaid },
    { label: "Payment Channel", value: params.paymentMethod },
    { label: "Remaining Balance", value: params.balanceRemaining },
  ];

  const html = wrapLuxuryEmailHtml({
    title: "Payment Receipt",
    badge: "Payment Verified",
    preheader: `We received your payment of ${params.amountPaid} for booking ${params.reference}.`,
    bodyHtml,
    metaFields,
    ctaText: "View Booking & Receipt",
    ctaUrl: params.manageUrl,
  });

  const text = `
BECCA'S CROWN • BEAUTY VAULT
PAYMENT RECEIPT

Hello ${params.customerName},
Thank you! We have received your payment of ${params.amountPaid} for booking ${params.reference}.

Amount Paid: ${params.amountPaid}
Remaining Balance: ${params.balanceRemaining}
Payment Channel: ${params.paymentMethod}

View your digital receipt: ${params.manageUrl}
  `.trim();

  return { subject, html, text };
}

export interface TestEmailParams {
  recipientEmail: string;
  providerName?: string;
}

export function buildTestEmail(params: TestEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const now = new Date().toLocaleString("en-GB", { timeZone: "Africa/Accra" });
  const subject = "Becca's Crown Beauty Vault • Resend Test Successful";

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">Hello,</p>
    <p style="margin: 0 0 14px 0;">
      This is a test notification from <strong>Becca&apos;s Crown Beauty Vault</strong>.
    </p>
    <p style="margin: 0;">
      Your Resend emailing infrastructure is active, verified, and configured to deliver high-deliverability booking vouchers and receipts.
    </p>
  `;

  const metaFields = [
    { label: "Email Provider", value: params.providerName || "Resend" },
    { label: "Recipient", value: params.recipientEmail },
    { label: "Timestamp (Accra)", value: now },
    { label: "Delivery Status", value: "Operational" },
  ];

  const html = wrapLuxuryEmailHtml({
    title: "Email System Active",
    badge: "Integration Verified",
    preheader: "Resend emailing structure is successfully configured for Becca's Crown.",
    bodyHtml,
    metaFields,
  });

  const text = `
BECCA'S CROWN • BEAUTY VAULT
TEST NOTIFICATION

Your Resend email service is working properly!
Sent to: ${params.recipientEmail} at ${now}.
  `.trim();

  return { subject, html, text };
}

export interface AppointmentReminderEmailParams {
  customerName: string;
  serviceName: string;
  dateFormatted: string;
  timeFormatted: string;
  reference: string;
  staffName?: string;
  amountDue: string;
  manageUrl: string;
}

export function buildAppointmentReminderEmail(params: AppointmentReminderEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Reminder: Your appointment tomorrow at Becca's Crown (${params.timeFormatted})`;

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">Dear <strong>${params.customerName}</strong>,</p>
    <p style="margin: 0 0 14px 0;">
      Friendly reminder that your luxury artistry session for <strong>${params.serviceName}</strong> is scheduled for <strong>${params.dateFormatted} at ${params.timeFormatted}</strong>.
    </p>
    <p style="margin: 0 0 10px 0;">
      <strong>Studio Preparation Instructions:</strong>
    </p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px; line-height: 1.8; color: #4b5563; font-size: 13px;">
      <li>Please arrive 10 minutes prior to your appointment time.</li>
      <li>For hair &amp; braids: please arrive with hair thoroughly washed, conditioned, and detangled.</li>
      <li>For lash artistry: avoid oil-based cleansers and eye makeup prior to your session.</li>
      <li>Complimentary refreshments await you at our Ghana studio.</li>
    </ul>
    <p style="margin: 0;">
      If you need to adjust your time, you may view or reschedule using your booking pass below.
    </p>
  `;

  const metaFields = [
    { label: "Booking Reference", value: params.reference },
    { label: "Treatment", value: params.serviceName },
    { label: "Date & Time", value: `${params.dateFormatted} at ${params.timeFormatted}` },
    ...(params.staffName ? [{ label: "Your Specialist", value: params.staffName }] : []),
    { label: "Balance Due at Studio", value: params.amountDue },
    { label: "Studio Location", value: "Becca's Crown Beauty Vault, Ghana" },
  ];

  const html = wrapLuxuryEmailHtml({
    title: "Appointment Tomorrow",
    badge: "24-Hour Reminder",
    subtitle: "We look forward to creating your signature crown look",
    preheader: `Friendly reminder for your appointment tomorrow at ${params.timeFormatted} (Ref: ${params.reference})`,
    bodyHtml,
    metaFields,
    ctaText: "View Digital Booking Pass",
    ctaUrl: params.manageUrl,
  });

  const text = `
BECCA'S CROWN • BEAUTY VAULT
APPOINTMENT REMINDER

Dear ${params.customerName},
Your appointment for ${params.serviceName} is tomorrow, ${params.dateFormatted} at ${params.timeFormatted}.

Reference: ${params.reference}
Assigned Specialist: ${params.staffName || "Studio Specialist"}
Balance Due: ${params.amountDue}
Location: Becca's Crown Beauty Vault, Ghana

Please arrive 10 minutes early. View or manage your appointment: ${params.manageUrl}
  `.trim();

  return { subject, html, text };
}

export interface PostServiceReviewEmailParams {
  customerName: string;
  serviceName: string;
  staffName?: string;
  reviewUrl?: string;
  rebookUrl?: string;
}

export function buildPostServiceReviewEmail(params: PostServiceReviewEmailParams): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Thank you for visiting Becca's Crown Beauty Vault ✨`;

  const bodyHtml = `
    <p style="margin: 0 0 14px 0;">Dear <strong>${params.customerName}</strong>,</p>
    <p style="margin: 0 0 14px 0;">
      Thank you for choosing <strong>Becca&apos;s Crown Beauty Vault</strong> today! It was an absolute pleasure pampering you and styling your <strong>${params.serviceName}</strong>.
    </p>
    <p style="margin: 0 0 10px 0;">
      <strong>Aftercare &amp; Crown Maintenance:</strong>
    </p>
    <ul style="margin: 0 0 16px 0; padding-left: 20px; line-height: 1.8; color: #4b5563; font-size: 13px;">
      <li>Wrap your hair with a silk or satin bonnet before sleeping to protect your styling.</li>
      <li>Keep your scalp moisturized using light oils (argan or jojoba).</li>
      <li>For lash clients: keep lashes dry for the first 24 hours and avoid oil-based cleansers.</li>
    </ul>
    <p style="margin: 0 0 8px 0;">
      How was your experience? Your feedback helps our artisans maintain world-class standards.
    </p>
  `;

  const metaFields = [
    { label: "Completed Service", value: params.serviceName },
    ...(params.staffName ? [{ label: "Artisan Specialist", value: params.staffName }] : []),
    { label: "Experience Rating", value: "⭐⭐⭐⭐⭐ VIP Artistry" },
  ];

  const reviewLink = params.reviewUrl || "https://booking-system-nu-lemon.vercel.app/review";

  const html = wrapLuxuryEmailHtml({
    title: "Thank You, Beautiful",
    badge: "Crown Experience",
    subtitle: "We loved having you at our Ghana studio today",
    preheader: `Thank you for visiting Becca's Crown Beauty Vault! Let us know how your experience was.`,
    bodyHtml,
    metaFields,
    ctaText: "Leave Us a 5-Star Review ↗",
    ctaUrl: reviewLink,
    secondaryCtaText: "Book Your Next Session Early",
    secondaryCtaUrl: params.rebookUrl || "https://booking-system-nu-lemon.vercel.app/book",
  });

  const text = `
BECCA'S CROWN • BEAUTY VAULT
THANK YOU FOR VISITING US

Dear ${params.customerName},
Thank you for trusting us with your ${params.serviceName} today!
We would love to hear your feedback: ${reviewLink}

Book your next session early: ${params.rebookUrl || "https://booking-system-nu-lemon.vercel.app/book"}
  `.trim();

  return { subject, html, text };
}

