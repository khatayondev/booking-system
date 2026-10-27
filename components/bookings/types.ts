import { BookingStatusType, PaymentStatusType } from "@/lib/payments/types";

export interface BookingCustomer {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  allergies?: string | null;
  preferences?: string | null;
  tags?: string[];
  marketingConsent?: boolean;
  completedVisits?: number;
}

export interface BookingStaff {
  id: string;
  name: string;
  phone?: string | null;
  photoUrl?: string | null;
  specialties: string[];
}

export interface BookingItemDetail {
  id: string;
  serviceId: string;
  name: string;
  pricePesewas: number;
  durationMin: number;
  bufferMin: number;
}

export interface BookingPaymentDetail {
  id: string;
  reference: string;
  status: PaymentStatusType;
  amountPesewas: number;
  channel?: string | null;
  createdAt: string;
}

export interface BookingAuditEntry {
  id: string;
  action: string;
  performedBy: string;
  details?: unknown;
  createdAt: string;
}

export interface BookingRecord {
  id: string;
  reference: string;
  status: BookingStatusType;
  source: "WEB" | "POS";
  startUtc: string;
  endUtc: string;
  subtotalPesewas: number;
  discountPesewas: number;
  totalPesewas: number;
  depositRequiredPesewas: number;
  amountPaidPesewas: number;
  balanceDuePesewas: number;
  customer: BookingCustomer;
  staff: BookingStaff;
  items: BookingItemDetail[];
  payments: BookingPaymentDetail[];
  notes?: string | null;
  createdAt: string;
  updatedAt?: string;
  auditTrail?: BookingAuditEntry[];
}

export interface BookingFilters {
  viewMode: "calendar" | "list";
  calendarSubView: "day" | "week" | "staff";
  selectedDate: string; // YYYY-MM-DD
  status: string; // "ALL" | BookingStatusType
  staffId: string; // "ALL" | staffId
  serviceId: string; // "ALL" | serviceId
  source: string; // "ALL" | "WEB" | "POS"
  paymentStatus: string; // "ALL" | PaymentStatusType
  search: string;
  page: number;
  limit: number;
}
