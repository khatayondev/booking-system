/**
 * CSV Export Generator for Studio Reports.
 * Formats financial reconciliations and operational metrics into CSV format.
 */

import { ComprehensiveReport } from "./types";

function escapeCsvField(field: string | number | undefined | null): string {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function toGhs(pesewas: number): string {
  return (pesewas / 100).toFixed(2);
}

/**
 * Builds a comprehensive multi-section CSV report.
 */
export function generateComprehensiveCsv(report: ComprehensiveReport): string {
  const c = report.current;
  const lines: string[] = [];

  // Header / Metadata
  lines.push(`"STUDIO BUSINESS REPORT"`);
  lines.push(`"Generated At","${report.generatedAt}","Timezone","${report.timezone}"`);
  lines.push(`"Reporting Period","${c.period.startDate} to ${c.period.endDate}"`);
  lines.push("");

  // Section 1: Executive Financial Summary
  lines.push(`"EXECUTIVE SUMMARY"`);
  lines.push(`"Metric","Value (GH₵ / Count)","Notes"`);
  lines.push(`"Gross Revenue (Payments Ledger)","${toGhs(c.summary.grossRevenuePesewas)}","Total paid before refunds"`);
  lines.push(`"Total Refunds","${toGhs(c.summary.refundsPesewas)}","Completed refunds"`);
  lines.push(`"Net Revenue (Reconciled)","${toGhs(c.summary.netRevenuePesewas)}","Gross revenue minus refunds"`);
  lines.push(`"Total Bookings","${c.summary.totalBookings}","All scheduled in period"`);
  lines.push(`"Average Order Value (AOV)","${toGhs(c.summary.averageOrderValuePesewas)}","Net revenue / Total bookings"`);
  lines.push(`"Cancellation Rate","${c.summary.cancellationRate}%","Cancelled / Total"`);
  lines.push(`"No-Show Rate","${c.summary.noShowRate}%","No-Show / Total"`);
  lines.push("");

  // Section 2: Revenue by Day
  lines.push(`"REVENUE BY DAY"`);
  lines.push(`"Date Key","Date","Gross Revenue (GH₵)","Refunds (GH₵)","Net Revenue (GH₵)","Transactions"`);
  for (const d of c.revenueByDay) {
    lines.push(
      [
        escapeCsvField(d.key),
        escapeCsvField(d.label),
        escapeCsvField(toGhs(d.grossPesewas)),
        escapeCsvField(toGhs(d.refundsPesewas)),
        escapeCsvField(toGhs(d.netPesewas)),
        escapeCsvField(d.count),
      ].join(",")
    );
  }
  lines.push("");

  // Section 3: Revenue by Payment Method
  lines.push(`"REVENUE BY PAYMENT METHOD"`);
  lines.push(`"Channel Code","Channel Name","Gross (GH₵)","Refunds (GH₵)","Net (GH₵)","Transactions"`);
  for (const pm of c.revenueByPaymentMethod) {
    lines.push(
      [
        escapeCsvField(pm.channel),
        escapeCsvField(pm.displayName),
        escapeCsvField(toGhs(pm.grossPesewas)),
        escapeCsvField(toGhs(pm.refundsPesewas)),
        escapeCsvField(toGhs(pm.netPesewas)),
        escapeCsvField(pm.transactionCount),
      ].join(",")
    );
  }
  lines.push("");

  // Section 4: Revenue by Service
  lines.push(`"REVENUE BY SERVICE"`);
  lines.push(`"Service ID","Service Name","Category","Gross (GH₵)","Refunds (GH₵)","Net (GH₵)","Bookings Count"`);
  for (const s of c.revenueByService) {
    lines.push(
      [
        escapeCsvField(s.serviceId),
        escapeCsvField(s.serviceName),
        escapeCsvField(s.categoryName),
        escapeCsvField(toGhs(s.grossPesewas)),
        escapeCsvField(toGhs(s.refundsPesewas)),
        escapeCsvField(toGhs(s.netPesewas)),
        escapeCsvField(s.bookingCount),
      ].join(",")
    );
  }
  lines.push("");

  // Section 5: Staff Performance & Utilisation
  lines.push(`"STAFF PERFORMANCE & UTILISATION"`);
  lines.push(`"Staff ID","Staff Name","Booked Minutes","Available Minutes","Utilisation Rate (%)","Appointments","Net Revenue (GH₵)"`);
  for (const u of c.staffUtilisation) {
    const sRev = c.revenueByStaff.find((s) => s.staffId === u.staffId);
    lines.push(
      [
        escapeCsvField(u.staffId),
        escapeCsvField(u.staffName),
        escapeCsvField(u.bookedMinutes),
        escapeCsvField(u.availableMinutes),
        escapeCsvField(`${u.utilisationRate}%`),
        escapeCsvField(u.appointmentCount),
        escapeCsvField(toGhs(sRev?.netPesewas || 0)),
      ].join(",")
    );
  }
  lines.push("");

  // Section 6: Staff Commissions (if enabled)
  if (c.commissions.enabled) {
    lines.push(`"STAFF COMMISSIONS REPORT"`);
    lines.push(`"Staff ID","Staff Name","Completed Revenue (GH₵)","Commission Rate (%)","Commission Due (GH₵)","Appointments"`);
    for (const comm of c.commissions.items) {
      lines.push(
        [
          escapeCsvField(comm.staffId),
          escapeCsvField(comm.staffName),
          escapeCsvField(toGhs(comm.completedRevenuePesewas)),
          escapeCsvField(`${comm.commissionRatePercent}%`),
          escapeCsvField(toGhs(comm.commissionPesewas)),
          escapeCsvField(comm.appointmentCount),
        ].join(",")
      );
    }
    lines.push("");
  }

  // Section 7: Top Customers
  lines.push(`"TOP CUSTOMERS"`);
  lines.push(`"Customer ID","Name","Phone","Visit Count","Net Spend (GH₵)"`);
  for (const cust of c.topCustomers) {
    lines.push(
      [
        escapeCsvField(cust.customerId),
        escapeCsvField(cust.name),
        escapeCsvField(cust.phone),
        escapeCsvField(cust.visitCount),
        escapeCsvField(toGhs(cust.netSpendPesewas)),
      ].join(",")
    );
  }

  return lines.join("\n");
}
