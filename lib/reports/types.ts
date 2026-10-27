export interface ReportPeriodInput {
  startDate: Date;
  endDate: Date;
  compare?: boolean;
}

export interface RevenueByPeriodItem {
  key: string; // "2026-10-27" or "2026-W43" or "2026-10"
  label: string; // Formatted date label e.g. "27 Oct" or "Week 43" or "Oct 2026"
  grossPesewas: number;
  refundsPesewas: number;
  netPesewas: number;
  count: number;
}

export interface RevenueByServiceItem {
  serviceId: string;
  serviceName: string;
  categoryName: string;
  grossPesewas: number;
  refundsPesewas: number;
  netPesewas: number;
  bookingCount: number;
}

export interface RevenueByStaffItem {
  staffId: string;
  staffName: string;
  grossPesewas: number;
  refundsPesewas: number;
  netPesewas: number;
  appointmentCount: number;
  commissionPesewas?: number;
}

export interface RevenueByPaymentMethodItem {
  channel: string;
  displayName: string;
  grossPesewas: number;
  refundsPesewas: number;
  netPesewas: number;
  transactionCount: number;
}

export interface BookingSourceItem {
  source: string;
  displayName: string;
  count: number;
  percentage: number;
}

export interface BookingStatusItem {
  status: string;
  displayName: string;
  count: number;
  percentage: number;
}

export interface BookingsMetrics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShowBookings: number;
  cancellationRate: number; // e.g. 12.5%
  noShowRate: number; // e.g. 4.2%
  bySource: BookingSourceItem[];
  byStatus: BookingStatusItem[];
}

export interface StaffUtilisationItem {
  staffId: string;
  staffName: string;
  bookedMinutes: number;
  availableMinutes: number;
  utilisationRate: number; // percentage capped at 100
  appointmentCount: number;
}

export interface TopCustomerItem {
  customerId: string;
  name: string;
  phone: string;
  visitCount: number;
  netSpendPesewas: number;
}

export interface TopServiceItem {
  serviceId: string;
  name: string;
  category: string;
  bookingCount: number;
  revenuePesewas: number;
}

export interface StaffCommissionItem {
  staffId: string;
  staffName: string;
  completedRevenuePesewas: number;
  commissionRatePercent: number;
  commissionPesewas: number;
  appointmentCount: number;
}

export interface StaffCommissionReport {
  enabled: boolean;
  defaultCommissionRatePercent: number;
  totalCommissionPesewas: number;
  items: StaffCommissionItem[];
}

export interface PeriodSummary {
  grossRevenuePesewas: number;
  refundsPesewas: number;
  netRevenuePesewas: number;
  totalBookings: number;
  averageOrderValuePesewas: number;
  cancellationRate: number;
  noShowRate: number;
}

export interface PeriodReportData {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: PeriodSummary;
  revenueByDay: RevenueByPeriodItem[];
  revenueByWeek: RevenueByPeriodItem[];
  revenueByMonth: RevenueByPeriodItem[];
  revenueByService: RevenueByServiceItem[];
  revenueByStaff: RevenueByStaffItem[];
  revenueByPaymentMethod: RevenueByPaymentMethodItem[];
  bookings: BookingsMetrics;
  staffUtilisation: StaffUtilisationItem[];
  topCustomers: TopCustomerItem[];
  topServices: TopServiceItem[];
  commissions: StaffCommissionReport;
}

export interface PeriodDeltas {
  netRevenuePercent: number;
  grossRevenuePercent: number;
  bookingsPercent: number;
  aovPercent: number;
  cancellationRateDiff: number;
  noShowRateDiff: number;
}

export interface ComprehensiveReport {
  generatedAt: string;
  timezone: string;
  current: PeriodReportData;
  previous?: {
    period: {
      startDate: string;
      endDate: string;
    };
    summary: PeriodSummary;
  };
  deltas?: PeriodDeltas;
}
