import Link from "next/link";
import Image from "next/image";
import {
  Sparkles,
  Calendar,
  Clock,
  ShieldCheck,
  ArrowRight,
  Star,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status-chip";

export default function CustomerPublicPage() {
  const featuredServices = [
    {
      id: "bridal-glam",
      title: "Luxury Bridal Soft Glam",
      category: "Makeup",
      duration: "90 min",
      price: "GH₵ 550.00",
      image: "/images/hero_bridal_glam.jpg",
      description: "Waterproof HD bridal makeup, skin prep, luxury lash set & touch-up kit.",
    },
    {
      id: "volume-lashes",
      title: "Russian Volume Lashes",
      category: "Lashes & Brows",
      duration: "105 min",
      price: "GH₵ 280.00",
      image: "/images/lashes_studio.jpg",
      description: "Ultra-fluffy handcrafted volume fans for dramatic, lightweight fullness.",
    },
    {
      id: "emerald-gown",
      title: "Emerald Beaded Evening Gown",
      category: "Dress Rentals",
      duration: "3-Day Rental",
      price: "GH₵ 450.00",
      image: "/images/luxury_gown_rental.jpg",
      description: "Hand-beaded couture corset gown with train. Dry cleaning included.",
    },
    {
      id: "studio-vip",
      title: "VIP Studio Experience",
      category: "Full Pamper",
      duration: "180 min",
      price: "GH₵ 850.00",
      image: "/images/salon_interior_accra.jpg",
      description: "Private booth, champagne, silk press, brow lamination and full glam.",
    },
  ];

  const steps = [
    {
      step: "01",
      title: "Select Services & Add-ons",
      desc: "Pick your hair, lashes, makeup or couture dress rental. Add upgrades like brow sculpting or extra hair wash.",
    },
    {
      step: "02",
      title: "Choose Stylist & Slot",
      desc: "Pick your preferred artist or select 'Any available' for our fastest booking rotation with real-time calendar holds.",
    },
    {
      step: "03",
      title: "Instant Mobile Money Hold",
      desc: "Enter your phone number and confirm with MTN MoMo, Telecel Cash or Card. No passwords or account setup needed.",
    },
  ];

  const testimonials = [
    {
      name: "Akosua Mensah",
      role: "Bride • Airport Residential",
      quote:
        "The booking process was so smooth! I held my bridal slot right from my phone and paid with MoMo. The team at East Legon was prompt and stunning.",
      rating: 5,
    },
    {
      name: "Nana Yaa Boateng",
      role: "Event Host • East Legon",
      quote:
        "Rented an emerald gown and had my makeup done in the same morning. Zero waiting time—they honor appointment slots to the minute.",
      rating: 5,
    },
    {
      name: "Dr. Evelyn Addo",
      role: "Cantonments, Accra",
      quote:
        "Best lash technician in Accra. My volume set lasted 4 full weeks without irritation. The monochrome studio atmosphere is so calming.",
      rating: 5,
    },
  ];

  return (
    <div className="space-y-16 sm:space-y-24 py-6 sm:py-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-[32px] border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl p-6 sm:p-12 lg:p-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Text */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/5 border border-black/5 text-xs font-semibold">
              <StatusChip status="green" label="East Legon Studio Open" />
              <span className="text-[#71717A]">• Instant Guest Booking</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-[#1E1E1E] tracking-tight leading-[1.08]">
              Effortless Beauty, <br />
              <span className="text-[#71717A]">Couture Elegance</span> in Accra.
            </h1>

            <p className="text-sm sm:text-base text-[#71717A] max-w-xl leading-relaxed">
              Book bridal makeup artists, certified lash technicians, luxury hairstylists, and designer evening gown rentals in East Legon. No account needed—reserve your slot in under 2 minutes with Mobile Money.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link href="/book" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="w-full sm:w-auto bg-[#1E1E1E] text-white hover:bg-black rounded-full px-8 h-12 text-sm font-bold shadow-lg gap-2 cursor-pointer"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
              <Link href="/our-services" className="w-full sm:w-auto">
                <Button
                  variant="outlinePill"
                  size="lg"
                  className="w-full sm:w-auto rounded-full px-6 h-12 text-sm font-semibold bg-white cursor-pointer"
                >
                  Browse Menu & Rates
                </Button>
              </Link>
            </div>

            {/* Micro Trust Stats */}
            <div className="pt-4 border-t border-black/5 flex flex-wrap items-center gap-6 text-xs text-[#71717A]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Zero Double-Booking Guarantee</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#1E1E1E]" />
                <span>15-Min Punctuality Window</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Pay via MoMo / Card</span>
              </div>
            </div>
          </div>

          {/* Right Hero Image Card */}
          <div className="lg:col-span-5 relative">
            <div className="relative rounded-[28px] overflow-hidden border border-black/10 shadow-2xl aspect-[4/5] max-h-[500px] w-full bg-[#1E1E1E]">
              <Image
                src="/images/hero_bridal_glam.jpg"
                alt="Luxury bridal glam makeup by Aura Beauty Studio Accra"
                fill
                priority
                className="object-cover object-center transform hover:scale-105 transition-transform duration-700"
                sizes="(max-width: 768px) 100vw, 500px"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6 text-white">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  Featured Masterclass Look
                </span>
                <p className="text-lg font-extrabold mt-1">Bridal Glow & Sleek Styling</p>
                <div className="flex items-center justify-between mt-3 text-xs text-white/80">
                  <span>From GH₵ 550.00</span>
                  <Link
                    href="/book"
                    className="inline-flex items-center gap-1 font-bold text-white hover:text-amber-300 transition-colors"
                  >
                    <span>Reserve Look</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How Booking Works (3 Steps) */}
      <section className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
            Frictionless & Fast
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-[#1E1E1E] tracking-tight">
            How Guest Booking Works
          </h2>
          <p className="text-xs sm:text-sm text-[#71717A]">
            No usernames, passwords or app downloads. Complete your booking in 3 simple steps.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((item, idx) => (
            <Card
              key={idx}
              variant="glass"
              className="p-6 sm:p-8 relative overflow-hidden group hover:border-black/20 transition-all"
            >
              <div className="text-3xl font-black text-black/10 group-hover:text-black/20 transition-colors mb-4">
                {item.step}
              </div>
              <h3 className="text-base font-bold text-[#1E1E1E] mb-2">{item.title}</h3>
              <p className="text-xs text-[#71717A] leading-relaxed">{item.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured Services Grid */}
      <section className="space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-[#71717A]">
              Curated Catalogue
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-[#1E1E1E] tracking-tight mt-1">
              Popular Studio Services
            </h2>
          </div>
          <Link href="/our-services">
            <Button variant="outlinePill" size="sm" className="gap-1.5 bg-white text-xs cursor-pointer">
              <span>View Full Menu</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {featuredServices.map((svc) => (
            <div
              key={svc.id}
              className="group rounded-[28px] overflow-hidden border border-black/5 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1E1E1E]">
                  <Image
                    src={svc.image}
                    alt={svc.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                  <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-white/90 backdrop-blur-xs text-[10px] font-bold text-[#1E1E1E] shadow-xs">
                    {svc.category}
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <div className="flex items-center justify-between text-xs text-[#71717A]">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {svc.duration}
                    </span>
                    <span className="font-extrabold text-[#1E1E1E]">{svc.price}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1E1E1E] line-clamp-1 group-hover:text-black">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed">
                    {svc.description}
                  </p>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link href="/book">
                  <Button
                    variant="blackPill"
                    size="sm"
                    className="w-full text-xs font-bold gap-1 cursor-pointer"
                  >
                    <span>Book Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Verified Customer Testimonials */}
      <section className="rounded-[32px] border border-black/5 bg-[#F9F9FB] p-6 sm:p-12 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <div className="flex items-center justify-center gap-1 text-amber-500">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <h2 className="text-xl sm:text-3xl font-black text-[#1E1E1E] tracking-tight">
            Accra&apos;s Most Trusted Beauty Studio
          </h2>
          <p className="text-xs text-[#71717A]">
            Real feedback from verified appointments booked through our platform.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <Card key={idx} variant="white" className="p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-400">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-[#1E1E1E] italic leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>
              <div className="pt-3 border-t border-black/5">
                <p className="text-xs font-bold text-[#1E1E1E]">{t.name}</p>
                <p className="text-[10px] text-[#71717A]">{t.role}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Call To Action Banner */}
      <section className="relative rounded-[32px] bg-[#1E1E1E] text-white p-8 sm:p-12 lg:p-16 text-center space-y-6 overflow-hidden">
        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <span className="inline-block px-3 py-1 rounded-full bg-white/10 text-[11px] font-bold uppercase tracking-wider text-amber-300">
            Ready to Shine?
          </span>
          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
            Reserve Your Appointment Today
          </h2>
          <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed max-w-lg mx-auto">
            Slots are held in real-time. Pick your stylist, select your date, and receive an instant SMS booking confirmation.
          </p>
          <div className="pt-2">
            <Link href="/book">
              <Button
                size="lg"
                className="bg-white text-[#1E1E1E] hover:bg-zinc-100 rounded-full px-8 h-12 text-sm font-bold shadow-lg gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Start Booking Flow</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
