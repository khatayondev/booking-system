import Link from "next/link";
import { ShieldCheck, Clock, RefreshCw, AlertCircle, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export const metadata = {
  title: "Policies & Terms | Becca's Crown Accra",
  description:
    "Review our transparent studio policies: 24h cancellations, rescheduling, deposit security, punctuality, and dress rental care in Accra, Ghana.",
};

export default function PoliciesPage() {
  const policies = [
    {
      icon: Clock,
      title: "Punctuality & 15-Minute Grace Period",
      desc: "To respect all clients' schedules, we observe a strict 15-minute grace period. If you arrive more than 15 minutes past your appointment start time, your service duration may be adjusted or rescheduled to avoid delaying subsequent clients.",
    },
    {
      icon: RefreshCw,
      title: "Cancellation & Rescheduling Window",
      desc: "We understand plans can change. You can cancel or reschedule your booking free of charge up to 24 hours prior to your scheduled start time. Your deposit will be fully refunded or credited towards your next booking.",
    },
    {
      icon: ShieldCheck,
      title: "Deposit & Payment Security",
      desc: "All reservations require a deposit (or full payment) to lock in your artist and time slot. When you select a slot in our booking wizard, it is held for 10 minutes while you complete payment. Payments are processed securely via Paystack with instant MTN MoMo, Telecel Cash, and Card verification.",
    },
    {
      icon: Crown,
      title: "Hygiene & Sanitation Standards",
      desc: "Your health is paramount. All metal lash and brow implements undergo hospital-grade sterilization between clients. We use disposable spoolies, applicators, and sanitize all studio chairs and high-touch surfaces continuously.",
    },
    {
      icon: AlertCircle,
      title: "Dress Rental Terms & Care",
      desc: "Gowns are rented for a standard 3-day window. Professional dry cleaning is included in the rental fee—do not attempt to clean or iron couture garments at home. A refundable security deposit is inspected upon return.",
    },
    {
      icon: Crown,
      title: "No Account Required",
      desc: "We prioritize your privacy and speed. You will never be asked to create a username, memorize a password, or download an application. Your booking details and SMS notifications are tied directly to your Ghana phone number.",
    },
  ];

  return (
    <div className="space-y-10 sm:space-y-14 py-6 sm:py-8 max-w-4xl mx-auto">
      {/* Header */}
      <ScrollReveal variant="fade-up">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/5 text-[11px] font-bold uppercase tracking-wider text-[#71717A]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fair & Transparent Standards</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-[#1E1E1E] tracking-tight">
            Studio Policies
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] max-w-xl mx-auto leading-relaxed">
            Our policies are designed to ensure seamless service, zero double-booking, and an exceptional luxury experience for every client.
          </p>
        </div>
      </ScrollReveal>

      {/* Policies Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {policies.map((p, idx) => {
          const Icon = p.icon;
          return (
            <ScrollReveal key={idx} variant="fade-up" delayMs={idx * 75}>
              <Card
                variant="white"
                className="p-6 sm:p-7 space-y-3 hover:border-black/20 transition-all rounded-[28px] h-full"
              >
                <div className="w-10 h-10 rounded-2xl bg-[#F4F4F6] text-[#1E1E1E] flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-[#1E1E1E]">{p.title}</h2>
                <p className="text-xs text-[#71717A] leading-relaxed">{p.desc}</p>
              </Card>
            </ScrollReveal>
          );
        })}
      </div>

      {/* Questions CTA */}
      <ScrollReveal variant="fade-up">
        <Card variant="glass" className="p-8 text-center space-y-4 rounded-[32px]">
          <h2 className="text-lg sm:text-xl font-black text-[#1E1E1E]">
            Have questions about your upcoming event or booking?
          </h2>
          <p className="text-xs text-[#71717A] max-w-md mx-auto">
            Our studio concierge is available daily via WhatsApp or phone call to assist with group bookings, custom bridal trials, and policy inquiries.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/contact">
              <Button variant="blackPill" size="md" className="gap-2 text-xs font-bold shadow-md cursor-pointer">
                <span>Contact Concierge</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/book">
              <Button variant="outlinePill" size="md" className="text-xs font-semibold bg-white cursor-pointer">
                <span>Proceed to Booking</span>
              </Button>
            </Link>
          </div>
        </Card>
      </ScrollReveal>
    </div>
  );
}
