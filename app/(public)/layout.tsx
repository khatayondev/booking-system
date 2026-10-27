import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles, MapPin, Clock, Calendar, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Aura Beauty Studio | Makeup, Lashes, Hair & Dress Rentals in Accra, Ghana",
  description:
    "Book premier beauty services in East Legon, Accra. Certified lash artists, master bridal makeup, luxury hair styling, and couture dress rentals. Instant guest checkout with Mobile Money and card.",
  keywords: [
    "beauty salon Accra",
    "bridal makeup Ghana",
    "lash extensions Accra",
    "hair styling East Legon",
    "dress rental Accra",
    "beauty booking Ghana",
  ],
  openGraph: {
    title: "Aura Beauty Studio | Accra, Ghana",
    description: "Book premier beauty services in East Legon, Accra. Guest checkout via Mobile Money.",
    url: "https://aurastudio.gh",
    siteName: "Aura Beauty Studio",
    locale: "en_GH",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "BeautySalon",
  name: "Aura Beauty Studio",
  image: "https://aurastudio.gh/images/hero_bridal_glam.jpg",
  telephone: "+233241112233",
  url: "https://aurastudio.gh",
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
    <div className="min-h-screen flex flex-col justify-between selection:bg-black selection:text-white">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Floating Glass Navbar */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 border-b border-black/5 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-2xl bg-[#1E1E1E] text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
              <Sparkles className="w-4 h-4 text-amber-200" />
            </div>
            <div>
              <span className="text-sm sm:text-base font-extrabold text-[#1E1E1E] tracking-tight block">
                AURA BEAUTY STUDIO
              </span>
              <span className="text-[10px] text-[#71717A] tracking-wider block font-medium">
                East Legon • Accra, Ghana
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#71717A]">
            <Link href="/" className="hover:text-[#1E1E1E] transition-colors">
              Home
            </Link>
            <Link href="/our-services" className="hover:text-[#1E1E1E] transition-colors">
              Services
            </Link>
            <Link href="/gallery" className="hover:text-[#1E1E1E] transition-colors">
              Gallery
            </Link>
            <Link href="/policies" className="hover:text-[#1E1E1E] transition-colors">
              Policies
            </Link>
            <Link href="/contact" className="hover:text-[#1E1E1E] transition-colors">
              Contact
            </Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            <Link href="/book">
              <Button
                size="sm"
                className="bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-9 px-4 sm:px-5 gap-1.5 shadow-sm cursor-pointer"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Book Appointment</span>
              </Button>
            </Link>

            <Link href="/login" className="hidden sm:inline-block">
              <Button
                variant="outlinePill"
                size="sm"
                className="rounded-full text-xs h-9 px-3 text-[#71717A] hover:text-[#1E1E1E] cursor-pointer bg-white"
                title="Staff Portal Login"
              >
                Staff
              </Button>
            </Link>
          </div>
        </div>

        {/* Mobile Navigation Strip (Visible on 360px Viewports) */}
        <div className="md:hidden border-t border-black/5 bg-white/90 px-4 py-2 flex items-center justify-around text-[11px] font-semibold text-[#71717A] overflow-x-auto">
          <Link href="/" className="hover:text-[#1E1E1E] whitespace-nowrap px-1">
            Home
          </Link>
          <Link href="/our-services" className="hover:text-[#1E1E1E] whitespace-nowrap px-1">
            Services
          </Link>
          <Link href="/book" className="text-[#1E1E1E] font-bold whitespace-nowrap px-1">
            Book
          </Link>
          <Link href="/gallery" className="hover:text-[#1E1E1E] whitespace-nowrap px-1">
            Gallery
          </Link>
          <Link href="/policies" className="hover:text-[#1E1E1E] whitespace-nowrap px-1">
            Policies
          </Link>
          <Link href="/contact" className="hover:text-[#1E1E1E] whitespace-nowrap px-1">
            Contact
          </Link>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Monochrome Glass Footer */}
      <footer className="mt-16 border-t border-black/5 bg-white/70 backdrop-blur-md pt-12 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: Brand */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#1E1E1E] text-white flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4 text-amber-200" />
                </div>
                <span className="font-extrabold text-sm text-[#1E1E1E]">AURA BEAUTY STUDIO</span>
              </div>
              <p className="text-xs text-[#71717A] leading-relaxed">
                Ghana&apos;s premier destination for bespoke bridal makeup, certified lash artistry, luxury hair styling, and couture dress rentals.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-[#71717A]">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Guest Booking • No Account Required</span>
              </div>
            </div>

            {/* Col 2: Studio Hours & Location */}
            <div className="space-y-2.5 text-xs text-[#71717A]">
              <h4 className="font-bold text-[#1E1E1E] uppercase text-[11px] tracking-wider">
                Studio & Hours
              </h4>
              <p className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#1E1E1E] shrink-0 mt-0.5" />
                <span>Lagos Avenue, East Legon, Accra, Ghana</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E1E1E] shrink-0" />
                <span>Mon – Sat: 09:00 – 19:00 GMT</span>
              </p>
              <p className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E1E1E] shrink-0" />
                <span>Sun: 12:00 – 18:00 GMT</span>
              </p>
            </div>

            {/* Col 3: Navigation */}
            <div className="space-y-2 text-xs">
              <h4 className="font-bold text-[#1E1E1E] uppercase text-[11px] tracking-wider">
                Quick Links
              </h4>
              <ul className="space-y-1.5 text-[#71717A]">
                <li>
                  <Link href="/book" className="hover:text-[#1E1E1E] transition-colors">
                    Online Booking Wizard
                  </Link>
                </li>
                <li>
                  <Link href="/our-services" className="hover:text-[#1E1E1E] transition-colors">
                    Services & Pricing Menu
                  </Link>
                </li>
                <li>
                  <Link href="/gallery" className="hover:text-[#1E1E1E] transition-colors">
                    Client Transformation Gallery
                  </Link>
                </li>
                <li>
                  <Link href="/policies" className="hover:text-[#1E1E1E] transition-colors">
                    Cancellation & Deposit Policies
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-[#1E1E1E] transition-colors">
                    Contact & Directions
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Payments Accepted */}
            <div className="space-y-3">
              <h4 className="font-bold text-[#1E1E1E] uppercase text-[11px] tracking-wider">
                Payments Accepted
              </h4>
              <p className="text-xs text-[#71717A]">
                Secure payments processed via Paystack Ghana in Ghana Cedis (GH₵).
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["MTN MoMo", "Telecel Cash", "AT Money", "Visa", "Mastercard", "Cash at Studio"].map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#F4F4F6] text-[#1E1E1E] border border-black/5"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-6 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#71717A]">
            <p>© 2026 Aura Beauty Studio. All rights reserved. Accra, Ghana.</p>
            <div className="flex items-center gap-4 text-[11px]">
              <Link href="/policies" className="hover:underline">
                Terms & Policies
              </Link>
              <span>•</span>
              <Link href="/contact" className="hover:underline">
                WhatsApp Studio
              </Link>
              <span>•</span>
              <Link href="/login" className="hover:underline">
                Staff Dashboard
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
