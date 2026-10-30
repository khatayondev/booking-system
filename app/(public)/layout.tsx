import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Crown, MapPin, Clock, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicNavbar } from "@/components/layout/public-navbar";
import { ScrollProgressBar } from "@/components/ui/scroll-reveal";

export const metadata: Metadata = {
  title: "Becca's Crown Beauty Vault | Premier Beauty Studio in Accra, Ghana",
  description:
    "Book premier beauty services in East Legon, Accra with Becca's Crown Beauty Vault. Certified lash artists, master bridal makeup, luxury hair styling, and aesthetics. Instant guest checkout with Mobile Money and card.",
  keywords: [
    "Becca's Crown Beauty Vault",
    "Becca's Crown",
    "beauty salon Accra",
    "bridal makeup Ghana",
    "lash extensions Accra",
    "hair styling East Legon",
    "aesthetics Accra",
    "beauty booking Ghana",
  ],
  openGraph: {
    title: "Becca's Crown Beauty Vault | Accra, Ghana",
    description: "Book premier beauty services in East Legon, Accra. Guest checkout via Mobile Money.",
    url: "https://beccascrown.gh",
    siteName: "Becca's Crown Beauty Vault",
    locale: "en_GH",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  name: "Becca's Crown Beauty Vault",
  image: "https://beccascrown.gh/images/hero_bridal_glam.jpg",
  telephone: "+233241112233",
  url: "https://beccascrown.gh",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Lagos Avenue, East Legon",
    addressLocality: "Accra",
    addressRegion: "Greater Accra",
    postalCode: "GA-123-4567",
    addressCountry: "GH",
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: 5.6358,
    longitude: -0.1581,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      opens: "09:00",
      closes: "19:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Sunday"],
      opens: "12:00",
      closes: "18:00",
    },
  ],
  priceRange: "GH₵ 100 - GH₵ 1,500",
  currenciesAccepted: "GHS",
  paymentAccepted: "Mobile Money (MTN, Telecel, AT), Credit Card, Cash",
};

export default function PublicSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-white text-[#18181B] flex flex-col justify-between selection:bg-black selection:text-white">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Luxury Golden Scroll Progress Indicator */}
      <ScrollProgressBar />

      {/* Dynamic Public Navbar (Hidden on Homepage where integrated into Hero) */}
      <Suspense fallback={null}>
        <PublicNavbar />
      </Suspense>

      {/* Main Page Content */}
      <main className="flex-1 w-full max-w-full overflow-x-hidden">{children}</main>

      {/* Ultra-Luxury Obsidian Dark Footer */}
      <footer className="mt-20 w-full max-w-full overflow-x-hidden bg-[#141210] text-[#E4E4E7] pt-16 pb-12 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12">
          {/* Top Row: Brand & VIP Newsletter */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 border-b border-zinc-800/80 items-start">
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full border border-white/30 bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
                  <Crown className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <h3 className="font-black text-sm tracking-widest text-white uppercase leading-none">
                    BECCA&apos;S CROWN
                  </h3>
                  <span className="text-[9px] text-amber-300 uppercase tracking-wider font-bold block mt-0.5">
                    Beauty Vault
                  </span>
                </div>
              </div>
              <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
                14 Senchi Street, Airport Residential Area / East Legon, Accra, Ghana
                <br />
                hello@beccascrown.gh • +233 24 111 9988
              </p>
              <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Verified Private Appointments • Seamless Mobile Money Checkout</span>
              </div>
            </div>

            <div className="lg:col-span-7 lg:pl-10 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300 block">
                VIP Crown Society
              </span>
              <p className="text-xs text-zinc-400">
                Subscribe for private booking priority, seasonal lookbooks, and VIP beauty vault invitations.
              </p>
              <div className="flex items-center gap-2 max-w-md w-full">
                <input
                  type="email"
                  placeholder="Enter your email address..."
                  className="bg-zinc-900/90 border border-zinc-800 text-xs text-white rounded-xl px-3.5 h-10 w-full min-w-0 focus:outline-none focus:border-amber-400/60 placeholder:text-zinc-500"
                />
                <button
                  type="button"
                  className="bg-[#FACC15] hover:bg-[#EAB308] text-black font-bold h-10 px-4 rounded-xl text-xs flex items-center justify-center shrink-0 transition-colors shadow-xs"
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Middle Row: Links Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 text-xs text-zinc-400">
            {/* Col 1 */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                Services
              </h4>
              <ul className="space-y-2">
                <li><Link href="/book" className="hover:text-amber-300 transition-colors">Hair & Lace Installs</Link></li>
                <li><Link href="/book" className="hover:text-amber-300 transition-colors">Bridal Soft Glam</Link></li>
                <li><Link href="/book" className="hover:text-amber-300 transition-colors">Russian Volume Lashes</Link></li>
                <li><Link href="/book" className="hover:text-amber-300 transition-colors">Goddess Knotless Braids</Link></li>
                <li><Link href="/book" className="hover:text-amber-300 transition-colors">Luxury Jelly Pedicure</Link></li>
              </ul>
            </div>

            {/* Col 2 */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                Studio Experience
              </h4>
              <ul className="space-y-2">
                <li><Link href="/our-services" className="hover:text-amber-300 transition-colors">Treatment Menu & Rates</Link></li>
                <li><Link href="/gallery" className="hover:text-amber-300 transition-colors">Lookbook & Gallery</Link></li>
                <li><Link href="/policies" className="hover:text-amber-300 transition-colors">Hygiene & Safety Protocol</Link></li>
                <li><Link href="/contact" className="hover:text-amber-300 transition-colors">Studio Directions</Link></li>
                <li><Link href="/login" className="hover:text-amber-300 transition-colors">Stylist & Staff Login</Link></li>
              </ul>
            </div>

            {/* Col 3 */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                Guest Policies
              </h4>
              <ul className="space-y-2">
                <li><Link href="/policies" className="hover:text-amber-300 transition-colors">Cancellation Window</Link></li>
                <li><Link href="/policies" className="hover:text-amber-300 transition-colors">Deposit Terms</Link></li>
                <li><Link href="/privacy" className="hover:text-amber-300 transition-colors">Privacy Notice</Link></li>
                <li><Link href="/terms" className="hover:text-amber-300 transition-colors">Terms of Service</Link></li>
                <li><Link href="/contact" className="hover:text-amber-300 transition-colors">Customer Care</Link></li>
              </ul>
            </div>

            {/* Col 4 */}
            <div className="space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">
                Payment Partners
              </h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Official Paystack merchant. Instant MoMo authorization with real-time slot lock.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {["MTN MoMo", "Telecel", "AT Money", "Visa", "Mastercard", "Cash"].map((p) => (
                  <span
                    key={p}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-zinc-900 border border-zinc-800 text-zinc-300"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row: Legal, Socials, Copyright */}
          <div className="pt-8 border-t border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500">
            <p>© 2026 Becca&apos;s Crown Beauty Vault. All rights reserved. Accra, Ghana.</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2 text-zinc-400">
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy policy</Link>
              <Link href="/policies" className="hover:text-white transition-colors">Legal notice</Link>
              <Link href="/contact" className="hover:text-white transition-colors">WhatsApp Support</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
