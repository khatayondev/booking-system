import Link from "next/link";
import { Scale, Clock, RefreshCw, ShieldCheck, AlertCircle, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Terms of Service | Aura Beauty Studio Accra",
  description:
    "Terms of Service, booking terms, deposit refund windows, dress rental agreements, and studio guidelines for Aura Beauty Studio in Accra, Ghana.",
};

export default function TermsOfServicePage() {
  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto space-y-10 text-[#1E1E1E]">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
          <Scale className="w-3.5 h-3.5 text-black" />
          <span>Transparent Terms of Agreement</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#1E1E1E] tracking-tight">
          Terms of Service
        </h1>
        <p className="text-xs sm:text-sm text-[#71717A] max-w-xl mx-auto leading-relaxed">
          Please review these terms before booking your beauty appointment or luxury dress rental.
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E4E4E7] shadow-xs space-y-8 text-xs sm:text-sm leading-relaxed text-[#3F3F46]">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>1. Appointments & Slot Reservation Policy</span>
          </h2>
          <p>
            When you select a time slot on our online booking wizard, your slot is temporarily held for <strong>10 minutes</strong>. If payment of the required deposit or full prepayment is not completed within this hold window, the slot automatically releases back to the public pool to prevent artificial hoarding.
          </p>
          <p>
            Appointments are confirmed only upon successful gateway verification of payment by Paystack or when manually confirmed by studio reception.
          </p>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-emerald-600" />
            <span>2. Cancellations & Policy-Driven Refunds</span>
          </h2>
          <p>
            We maintain a clear, fair cancellation policy governed by the timestamp of your request relative to your appointment start time:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[#71717A]">
            <li><strong>More than 24 Hours Notice:</strong> Free cancellation. Your deposit is refunded in full to your original payment method, or credited toward a future reschedule.</li>
            <li><strong>Less than 24 Hours Notice:</strong> The booking deposit is forfeited to compensate the dedicated stylist for reserved studio time. Any excess prepayment beyond the deposit amount is promptly refunded.</li>
            <li><strong>No-Shows:</strong> Failure to attend an appointment without prior notification forfeits 100% of the deposit and may require full prepayment for future reservations.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>3. Luxury Dress & Couture Rental Terms</span>
          </h2>
          <p>
            Gown rentals are offered for a standard 3-day duration (fitting/pickup day, event day, return day):
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[#71717A]">
            <li><strong>Security Deposit:</strong> A refundable security deposit is held for the duration of the rental and inspected upon return.</li>
            <li><strong>Cleaning & Care:</strong> Professional dry cleaning is included in the rental fee. Clients must not attempt to wash, bleach, iron, or alter couture garments.</li>
            <li><strong>Damages:</strong> Irreparable tears, deep stains, or burns will incur repair fees deducted from the security deposit.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            <span>4. Punctuality & Grace Period</span>
          </h2>
          <p>
            We observe a strict <strong>15-minute grace period</strong>. If you arrive late, your service duration may be abbreviated to ensure subsequent clients are not delayed. If you arrive more than 20 minutes late without notification, the studio reserves the right to treat the session as a late cancellation.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-[#E4E4E7] pt-6">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E]">
            5. Governing Law
          </h2>
          <p className="text-[#71717A]">
            These terms are governed by and construed in accordance with the laws of the Republic of Ghana. Any disputes arising shall be subject to the exclusive jurisdiction of the courts of Ghana.
          </p>
        </section>
      </div>

      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#71717A] hover:text-[#1E1E1E] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
}
