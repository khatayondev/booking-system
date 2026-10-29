import Link from "next/link";
import { Shield, Lock, Eye, FileText, CheckCircle2, ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Becca's Crown Beauty Vault Accra",
  description:
    "Privacy Policy and Data Protection standards for Becca's Crown Beauty Vault in accordance with the Ghana Data Protection Act 2012 (Act 843).",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="py-8 sm:py-12 max-w-4xl mx-auto space-y-10 text-[#1E1E1E]">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Ghana Data Protection Act 2012 (Act 843)</span>
        </div>
        <h1 className="text-3xl sm:text-5xl font-black text-[#1E1E1E] tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-[#71717A] max-w-xl mx-auto leading-relaxed">
          Last updated: October 2026 • We practice strict PII minimisation. You will never be asked to create an account, register a password, or share unnecessary personal information.
        </p>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-[#E4E4E7] shadow-xs space-y-8 text-xs sm:text-sm leading-relaxed text-[#3F3F46]">
        {/* Section 1 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>1. Information We Collect (PII Minimisation)</span>
          </h2>
          <p>
            Becca&apos;s Crown Beauty Vault adheres to strict data minimisation principles. When you book an appointment, make a payment, or rent a luxury gown, we only collect the minimum details necessary to deliver our services:
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-[#71717A]">
            <li><strong>Full Name:</strong> To address you and identify your appointment upon arrival.</li>
            <li><strong>Telephone Number (Ghana E.164):</strong> Used as your primary booking identifier and to deliver automated appointment confirmations, 24h & 2h SMS reminders, and receipts.</li>
            <li><strong>Email Address (Optional):</strong> Provided if you wish to receive digital PDF calendar invites and email receipts.</li>
            <li><strong>Service Notes & Allergies (Optional):</strong> Client-provided sensitivities (e.g. latex or lash glue allergy) to ensure treatment safety.</li>
          </ul>
        </section>

        {/* Section 2 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-600" />
            <span>2. Payment Security & Zero Card Storage</span>
          </h2>
          <p>
            All electronic payments (Visa, Mastercard, MTN Mobile Money, Telecel Cash, AT Money) are processed securely through <strong>Paystack Ghana</strong>, a PCI-DSS Level 1 certified payment service provider.
          </p>
          <p>
            <strong>Becca&apos;s Crown Beauty Vault never stores, transmits, or has access to your debit card PAN, CVV security codes, or Mobile Money PINs.</strong> All transactions are conducted over encrypted TLS 1.3 tunnels with direct gateway tokenization.
          </p>
        </section>

        {/* Section 3 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <Eye className="w-4 h-4 text-emerald-600" />
            <span>3. How We Use Your Information</span>
          </h2>
          <p>Your information is used strictly for operational purposes:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-[#71717A]">
            <li>Reserving your exclusive studio appointment slot and dedicated specialist.</li>
            <li>Sending transactional SMS reminders 24 hours and 2 hours before your session.</li>
            <li>Processing cancellations, schedule changes, and policy refunds.</li>
            <li>Managing security deposits for bridal gown rentals.</li>
          </ul>
          <p>
            We do <strong>not</strong> sell, rent, or trade your personal data to third parties, advertising brokers, or telemarketing agencies.
          </p>
        </section>

        {/* Section 4 */}
        <section className="space-y-3">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E] flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>4. Your Data Rights & Right to Erasure (Anonymization)</span>
          </h2>
          <p>
            Under the Ghana Data Protection Act 2012 (Act 843), you have the right to inspect, correct, or request the permanent deletion of your customer profile.
          </p>
          <p>
            Upon your request, our administration can execute an immutable <strong>Data Anonymization</strong> routine that permanently replaces your name with anonymized initials, scrubs your phone number, and wipes your address while preserving aggregated tax receipts as required by Ghana Revenue Authority (GRA) fiscal regulations.
          </p>
        </section>

        {/* Section 5 */}
        <section className="space-y-3 border-t border-[#E4E4E7] pt-6">
          <h2 className="text-base sm:text-lg font-bold text-[#1E1E1E]">
            Contact Our Data Protection Officer
          </h2>
          <p className="text-[#71717A]">
            If you have questions about our privacy practices, wish to review your booking records, or request profile anonymization, please contact our studio reception:
          </p>
          <div className="bg-[#F4F4F6] p-4 rounded-2xl space-y-1 text-xs">
            <p className="font-bold text-[#1E1E1E]">Becca&apos;s Crown Beauty Vault East Legon</p>
            <p className="text-[#71717A]">14 Senchi Street, Airport Residential Area / East Legon, Accra, Ghana</p>
            <p className="text-[#71717A]">Phone: +233 24 000 0000 • Email: privacy@beccascrown.gh</p>
          </div>
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
