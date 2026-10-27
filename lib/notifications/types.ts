export type NotificationChannel = "SMS" | "EMAIL" | "IN_APP";

export type NotificationEvent =
  | "booking_confirmed"
  | "payment_received"
  | "payment_request"
  | "reminder_24h"
  | "reminder_2h"
  | "booking_rescheduled"
  | "booking_cancelled"
  | "refund_issued"
  | "no_show_followup"
  | "staff_alert_new_booking";

export interface TemplateVariables {
  name?: string;
  service?: string;
  date?: string;
  time?: string;
  reference?: string;
  manageLink?: string;
  amountDue?: string;
  businessName?: string;
  staffName?: string;
  amountPaid?: string;
  refundAmount?: string;
  [key: string]: string | number | undefined;
}

export interface SmsSendOptions {
  recipient: string; // phone number (e.g. +233...)
  message: string;
  senderId?: string;
  idempotencyKey?: string;
}

export interface SmsSendResult {
  success: boolean;
  gatewayMessageId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface SmsProvider {
  name: string;
  sendSms(options: SmsSendOptions): Promise<SmsSendResult>;
}

export interface EmailSendOptions {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  idempotencyKey?: string;
}

export interface EmailSendResult {
  success: boolean;
  gatewayMessageId?: string;
  error?: string;
  rawResponse?: unknown;
}

export interface EmailProvider {
  name: string;
  sendEmail(options: EmailSendOptions): Promise<EmailSendResult>;
}

export interface SmsEstimate {
  characterCount: number;
  encoding: "GSM-7" | "UNICODE";
  segmentCount: number;
  costEstimatePesewas: number;
}

export interface ProcessJobResult {
  success: boolean;
  suppressed?: boolean;
  retrying?: boolean;
  exhausted?: boolean;
  attempt?: number;
  nextRetryAt?: Date;
  gatewayId?: string;
  estimate?: SmsEstimate;
  error?: string;
  reason?: string;
  channel?: string;
}

