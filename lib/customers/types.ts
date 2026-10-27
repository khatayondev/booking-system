export interface CustomerSummary {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  tags: string[];
  allergies: string | null;
  preferences: string | null;
  marketingConsent: boolean;
  isAnonymized: boolean;
  visitCount: number;
  lifetimeSpendPesewas: number;
  lastVisit: string | null;
  upcomingBooking: {
    id: string;
    reference: string;
    startUtc: string;
    serviceNames: string[];
  } | null;
  createdAt: string;
}

export interface CustomerBookingHistoryItem {
  id: string;
  reference: string;
  status: string;
  source: string;
  startUtc: string;
  endUtc: string;
  totalPesewas: number;
  amountPaidPesewas: number;
  staffName: string;
  services: string[];
}

export interface CustomerReceiptHistoryItem {
  id: string;
  receiptNumber: string;
  status: string;
  totalPesewas: number;
  amountPaidPesewas: number;
  createdAt: string;
}

export interface CustomerDetail extends CustomerSummary {
  notes: string | null;
  marketingConsentAt: string | null;
  anonymizedAt: string | null;
  bookings: CustomerBookingHistoryItem[];
  receipts: CustomerReceiptHistoryItem[];
}

export interface CustomerListFilter {
  q?: string;
  tag?: string;
  hasAllergies?: boolean;
  marketingConsent?: boolean;
  page?: number;
  limit?: number;
}

export interface UpdateCustomerInput {
  name?: string;
  phone?: string;
  email?: string | null;
  notes?: string | null;
  allergies?: string | null;
  preferences?: string | null;
  tags?: string[];
  marketingConsent?: boolean;
}

export interface MergeCustomersInput {
  primaryCustomerId: string;
  duplicateCustomerId: string;
}

export interface AnonymizeCustomerInput {
  action: "ANONYMIZE" | "DELETE";
  reason?: string;
}
