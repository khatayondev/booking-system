export type PaymentRequestStatus =
  | "PENDING"
  | "SENT"
  | "VIEWED"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface CreatePaymentRequestInput {
  bookingId: string;
  amountPesewas?: number; // Optional; defaults to full remaining balance if omitted
  message?: string;
  phone?: string; // Optional; defaults to customer phone
  channel?: "ALL" | "CARD" | "MOBILE_MONEY";
  pushMomo?: boolean;
  momoProvider?: "MTN" | "TELECEL" | "AT";
  expiryMinutes?: number; // Defaults to 1440 (24h)
}

export interface PaymentRequestDetail {
  id: string;
  bookingId: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  amountPesewas: number;
  currency: string;
  message: string | null;
  channel: string;
  pushMomo: boolean;
  momoProvider: string | null;
  paystackReference: string | null;
  status: PaymentRequestStatus;
  expiresAt: string;
  viewedAt: string | null;
  paidAt: string | null;
  cancelledAt: string | null;
  createdByUserName: string | null;
  paymentId: string | null;
  payUrl: string;
  shortUrl: string;
  createdAt: string;
  updatedAt: string;
  // Raw token is only returned in creation response to staff
  rawToken?: string;
}

export interface PublicPaymentRequestView {
  id: string;
  bookingReference: string;
  customerName: string;
  customerPhone: string;
  amountPesewas: number;
  currency: string;
  message: string | null;
  status: PaymentRequestStatus;
  expiresAt: string;
  services: Array<{
    name: string;
    pricePesewas: number;
  }>;
  totalBookingPesewas: number;
  amountPaidPesewas: number;
  remainingBalancePesewas: number;
  staffName: string;
  startUtc: string;
}

export interface PayPaymentRequestInput {
  method: "MOBILE_MONEY" | "CARD";
  phone?: string;
  provider?: "MTN" | "TELECEL" | "AT";
  cardReference?: string;
}
