"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const ALL_SIGNATURE_TREATMENTS = [
  {
    id: "2b5d4b8d-2578-43bb-b003-a98c98cfe2b5",
    title: "Full Frontal Lace Installation",
    category: "HAIR & INSTALLS",
    rate: "GH₵ 160.00",
    duration: "90 min",
    image: "/images/ghanaian_hair_install.jpg",
    description: "Bleaching of knots, hairline customization, melting band press & precision sleek styling.",
  },
  {
    id: "d50e6584-a25e-4f8b-b7e7-0168aaa88fa4",
    title: "Bridal Soft Glam Makeup",
    category: "BRIDAL GLAM",
    rate: "GH₵ 550.00",
    duration: "90 min",
    image: "/images/ghanaian_bridal_glam.jpg",
    description: "Camera-ready HD soft contour, skin glaze prep, handcrafted lash fan & 24hr sealing setting spray.",
  },
  {
    id: "df8ee128-8912-4ac5-84bf-85aac75b5686",
    title: "Mega Volume Russian Lashes",
    category: "LASHES",
    rate: "GH₵ 280.00",
    duration: "90 min",
    image: "/images/ghanaian_volume_lashes.jpg",
    description: "Multi-dimensional fluffy volume fans custom mapped to your natural eye shape for supreme drama.",
  },
  {
    id: "c0292917-7f05-4de9-956e-41130a586b7f",
    title: "Luxury Jelly Spa Pedicure",
    category: "PEDICURE & SPA",
    rate: "GH₵ 160.00",
    duration: "90 min",
    image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=800&q=80",
    description: "Gelatinous thermal soak, callus peel, sugar polish scrub, foot massage and gel color finish.",
  },
  {
    id: "99436d01-56bb-4e23-abce-550f91af5e5a",
    title: "Frontal Sleek High Pony",
    category: "HAIR & INSTALLS",
    rate: "GH₵ 200.00",
    duration: "150 min",
    image: "/images/ghanaian_hero_beauty.jpg",
    description: "High tension sculpted sleek ponytail with customized ear-to-ear lace frontal melting.",
  },
  {
    id: "07850cc7-ffd1-44f1-9988-874726bc9c7b",
    title: "Goddess Knotless Braids",
    category: "HAIR & INSTALLS",
    rate: "GH₵ 350.00",
    duration: "180 min",
    image: "/images/ghanaian_goddess_braids.jpg",
    description: "Pain-free root feeding with human hair curls woven throughout for a full, lightweight silhouette.",
  },
];

const VAULT_SUITES = [
  {
    title: "Bridal Suite",
    subtitle: "Private Dressing",
    image: "/images/ghanaian_bridal_glam.jpg",
  },
  {
    title: "Hair Vault",
    subtitle: "Lace Stations",
    image: "/images/ghanaian_hair_install.jpg",
  },
  {
    title: "Lash Lounge",
    subtitle: "Ergonomic Pods",
    image: "/images/ghanaian_volume_lashes.jpg",
  },
  {
    title: "Nail Bar",
    subtitle: "Jelly Basins",
    image: "https://images.unsplash.com/photo-1519014816548-bf5fe059798b?auto=format&fit=crop&w=600&q=80",
  },
  {
    title: "VIP Lounge",
    subtitle: "Champagne Bar",
    image: "/images/ghanaian_hero_beauty.jpg",
  },
];

export default function CustomerPublicPage() {
  // Section 02 Category Filter State
  const [activeFilter, setActiveFilter] = React.useState<string>("ALL");
  const [carouselIndex, setCarouselIndex] = React.useState<number>(0);

  const filterOptions = ["ALL", "HAIR & INSTALLS", "BRIDAL GLAM", "LASHES", "PEDICURE & SPA"];

  const filteredTreatments = React.useMemo(() => {
    if (activeFilter === "ALL") return ALL_SIGNATURE_TREATMENTS;
    return ALL_SIGNATURE_TREATMENTS.filter((t) => t.category === activeFilter);
  }, [activeFilter]);

  const handlePrev = () => {
    setCarouselIndex((prev) => (prev > 0 ? prev - 1 : Math.max(0, filteredTreatments.length - 2)));
  };

  const handleNext = () => {
    setCarouselIndex((prev) => (prev < filteredTreatments.length - 2 ? prev + 1 : 0));
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden bg-white text-[#18181B] selection:bg-black selection:text-white pb-12">
      {/* =========================================================================
          HERO SECTION (Minimalistic & Modern Studio with Radiant Ghanaian Artistry)
      ========================================================================= */}
      <section className="w-full max-w-full overflow-x-hidden p-0 bg-zinc-950">
        <div className="relative w-full overflow-hidden shadow-2xl bg-[#18191c] flex flex-col justify-center min-h-[680px] sm:min-h-[760px] lg:min-h-[820px]">
          {/* Hero Beauty Background (Radiant Ghanaian bridal glam & lash artistry) */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/william-boateng-YE8pmhb_swo-unsplash.jpg"
              alt="Becca's Crown Beauty Vault Artistry"
              fill
              priority
              className="object-cover object-[center_35%] scale-100"
              sizes="100vw"
            />
            {/* Ambient Vignette for Crisp Contrast & Legibility */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black/60" />
          </div>

          {/* ===================================================================
              CENTER EDITORIAL TYPOGRAPHY & HERO CTA PILL
          =================================================================== */}
          <div className="relative z-10 px-4 sm:px-6 py-24 sm:py-32 lg:py-36 text-center max-w-5xl mx-auto">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-[1.04] drop-shadow-md">
              Our artistry is
              <br />
              minimalistic &amp; modern
            </h1>

            <p className="mt-5 sm:mt-6 text-sm sm:text-base lg:text-lg text-zinc-200 max-w-2xl mx-auto font-medium leading-relaxed drop-shadow-sm">
              We will be able to provide you with the best beauty experience
              from the master artisans at Becca&apos;s Crown Beauty Vault
            </p>

            {/* Hero CTA Pill: Book an Appointment Now */}
            <div className="mt-8 sm:mt-10 max-w-md sm:max-w-xl mx-auto px-2">
              <Link
                href="/book"
                className="group relative flex items-center justify-between rounded-full border border-white/30 hover:border-white/60 bg-black/40 hover:bg-black/60 backdrop-blur-md shadow-2xl pl-6 sm:pl-8 pr-2.5 py-2.5 sm:py-3 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <span className="text-sm sm:text-base font-semibold text-white group-hover:text-amber-200 transition-colors tracking-tight">
                  Book an Appointment Now
                </span>

                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-amber-500 group-hover:bg-amber-400 text-black flex items-center justify-center transition-all duration-300 group-hover:rotate-45 shadow-md shrink-0">
                  <ArrowUpRight className="w-5 h-5 text-black stroke-[2.5]" />
                </div>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION 01: OUR SERVICES (Numbered 01 with 3 Big Cards & Editorial Quote)
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-20 lg:py-28 space-y-16">
        {/* Section Header with 01 Numeral */}
        <ScrollReveal variant="fade-up">
          <div className="flex items-center gap-6 sm:gap-10">
            <span className="text-4xl sm:text-6xl font-serif text-zinc-300 font-light select-none">
              01
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
              Our services
            </h2>
          </div>
        </ScrollReveal>

        {/* 3 Image Cards with Rounded Corners & Badges */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {/* Card 1: Hair & Lace */}
          <ScrollReveal variant="fade-up" delayMs={0}>
            <div className="group relative rounded-[28px] overflow-hidden aspect-[4/5] bg-zinc-900 shadow-md">
              <Image
                src="/images/ghanaian_hair_install.jpg"
                alt="Hair Installation and Lace Melting"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/95 text-black text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Lace Installs & Ponies
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                <div>
                  <p className="text-xs text-amber-200 uppercase font-semibold tracking-wider">Precision Melting</p>
                  <h3 className="text-lg font-bold">Hair & Lace Artistry</h3>
                </div>
                <Link href="/book?serviceId=2b5d4b8d-2578-43bb-b003-a98c98cfe2b5&step=2">
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#FACC15] transition-colors cursor-pointer shadow-md">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 2: Bridal & Glam */}
          <ScrollReveal variant="fade-up" delayMs={150}>
            <div className="group relative rounded-[28px] overflow-hidden aspect-[4/5] bg-zinc-900 shadow-md">
              <Image
                src="/images/ghanaian_bridal_glam.jpg"
                alt="Bridal and Editorial Makeup"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/95 text-black text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Bridal & Soft Glam
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                <div>
                  <p className="text-xs text-amber-200 uppercase font-semibold tracking-wider">High Definition</p>
                  <h3 className="text-lg font-bold">Couture Bridal Makeup</h3>
                </div>
                <Link href="/book?serviceId=d50e6584-a25e-4f8b-b7e7-0168aaa88fa4&step=2">
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#FACC15] transition-colors cursor-pointer shadow-md">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            </div>
          </ScrollReveal>

          {/* Card 3: Lashes & Pedicure */}
          <ScrollReveal variant="fade-up" delayMs={300}>
            <div className="group relative rounded-[28px] overflow-hidden aspect-[4/5] bg-zinc-900 shadow-md">
              <Image
                src="/images/ghanaian_volume_lashes.jpg"
                alt="Lashes and Spa Pedicure"
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute top-4 left-4">
                <span className="px-3 py-1 rounded-full bg-white/95 text-black text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  Lashes & Pedicure
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex items-end justify-between text-white">
                <div>
                  <p className="text-xs text-amber-200 uppercase font-semibold tracking-wider">Russian & Jelly Spa</p>
                  <h3 className="text-lg font-bold">Lashes & Foot Care</h3>
                </div>
                <Link href="/book?serviceId=df8ee128-8912-4ac5-84bf-85aac75b5686&step=2">
                  <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center hover:bg-[#FACC15] transition-colors cursor-pointer shadow-md">
                    <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Center Editorial Statement & Button */}
        <ScrollReveal variant="fade-up" delayMs={200}>
          <div className="text-center max-w-2xl mx-auto space-y-6 pt-4">
            <p className="text-base sm:text-lg text-zinc-700 leading-relaxed font-normal">
              Whether you&apos;re preparing for your bridal aisle, a high-stakes executive gala, or your signature monthly crown refresh, our bespoke beauty vault ensures you arrive in style, confidence, and comfort.
            </p>
            <div>
              <Link href="/book">
                <Button
                  className="bg-[#FACC15] hover:bg-[#EAB308] text-black font-extrabold rounded-xl px-8 h-11 text-xs uppercase tracking-wider cursor-pointer shadow-sm"
                >
                  Book Your Treatment
                </Button>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* =========================================================================
          SECTION 02: SIGNATURE VAULT COLLECTION (Numbered 02 with Filter Pills)
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-16 lg:py-24 space-y-12 border-t border-zinc-200/60">
        {/* Section Header with 02 Numeral */}
        <ScrollReveal variant="fade-up">
          <div className="flex items-center gap-6 sm:gap-10">
            <span className="text-4xl sm:text-6xl font-serif text-zinc-300 font-light select-none">
              02
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-zinc-900 tracking-tight">
              Our vault collection
            </h2>
          </div>
        </ScrollReveal>

        {/* Category Filter Pills (Matching ALL / SEDAN / LUXURY in Reference) */}
        <ScrollReveal variant="fade-up" delayMs={100} className="w-full max-w-full min-w-0 overflow-hidden">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none w-full max-w-full">
            {filterOptions.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => {
                  setActiveFilter(f);
                  setCarouselIndex(0);
                }}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  activeFilter === f
                    ? "bg-[#18181B] text-white shadow-xs"
                    : "bg-white hover:bg-zinc-100 text-zinc-600 border border-zinc-200/80"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Horizontal Treatment Spotlight Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTreatments.map((item, idx) => (
            <ScrollReveal key={item.id} variant="fade-up" delayMs={idx * 80}>
              <div
                className="bg-white rounded-[26px] border border-zinc-200/80 p-5 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group h-full"
              >
                <div>
                  {/* Header Info */}
                  <div className="flex items-start justify-between pb-3">
                    <div>
                      <h3 className="font-bold text-sm text-zinc-900 group-hover:text-black">
                        {item.title}
                      </h3>
                      <p className="text-xs text-zinc-500 font-medium">{item.rate} / {item.duration}</p>
                    </div>
                  </div>

                  {/* Visual Showcase */}
                  <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden my-3 bg-zinc-100">
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                    <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-white/95 text-[10px] font-bold text-zinc-800 shadow-xs">
                      {item.category}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 mt-2">
                    {item.description}
                  </p>
                </div>

                {/* Card Footer with Gold Circle Button */}
                <div className="pt-4 mt-2 border-t border-zinc-100 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Guaranteed Slot
                  </span>
                  <Link href={`/book?serviceId=${item.id}&step=2`}>
                    <div className="flex items-center gap-2 text-xs font-extrabold text-zinc-900 hover:text-black group/btn cursor-pointer">
                      <span>Book now</span>
                      <div className="w-8 h-8 rounded-full bg-[#FACC15] flex items-center justify-center text-black group-hover/btn:scale-110 transition-transform shadow-xs">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </Link>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom Pagination & Full Menu Link */}
        <ScrollReveal variant="fade-up" delayMs={150}>
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrev}
                className="w-9 h-9 rounded-full border border-zinc-300 bg-white flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4 text-zinc-700" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="w-9 h-9 rounded-full border border-zinc-300 bg-white flex items-center justify-center hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4 text-zinc-700" />
              </button>
              <span className="text-xs text-zinc-500 font-medium pl-1">
                {filteredTreatments.length} treatments available
              </span>
            </div>

            <Link href="/our-services">
              <Button
                className="bg-[#FACC15] hover:bg-[#EAB308] text-black font-extrabold rounded-xl px-5 h-9 text-xs uppercase tracking-wider cursor-pointer shadow-xs"
              >
                Open Full Menu
              </Button>
            </Link>
          </div>
        </ScrollReveal>
      </section>

      {/* =========================================================================
          SECTION 03: THE STUDIO EXPERIENCE (Full Width, Full Black Background)
      ========================================================================= */}
      <section className="w-full max-w-full overflow-x-hidden bg-[#141210] text-white py-20 lg:py-28 my-16 lg:my-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 space-y-12 w-full max-w-full">
          {/* Section Header with 03 Numeral */}
          <ScrollReveal variant="fade-up">
            <div className="flex items-center gap-6 sm:gap-10">
              <span className="text-4xl sm:text-6xl font-serif text-zinc-600 font-light select-none">
                03
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                The studio experience
              </h2>
            </div>
          </ScrollReveal>

          {/* Split Layout: Editorial Left + 5 Vertical Story Cards Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center w-full max-w-full">
            {/* Left Text Column */}
            <ScrollReveal variant="fade-up" className="lg:col-span-4 space-y-6 w-full min-w-0">
              <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed font-normal">
                Experience the height of luxury and privacy with Becca&apos;s Crown at our private VIP studio lounge. Private suites, chilled champagne, hospital-grade sanitized instruments, and prompt on-time service.
              </p>
              <div>
                <Link href="/book">
                  <Button
                    className="bg-[#FACC15] hover:bg-[#EAB308] text-black font-extrabold rounded-xl px-6 h-10 text-xs uppercase tracking-wider cursor-pointer shadow-xs"
                  >
                    Reserve Suite
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Right Column: 5 Vertical Rounded Cards */}
            <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-5 gap-3 w-full min-w-0">
              {VAULT_SUITES.map((suite, idx) => (
                <ScrollReveal key={idx} variant="fade-up" delayMs={idx * 75}>
                  <div
                    className="group relative rounded-2xl overflow-hidden aspect-[9/18] bg-zinc-900 border border-white/10 shadow-lg"
                  >
                    <Image
                      src={suite.image}
                      alt={suite.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700 opacity-80"
                      sizes="(max-width: 768px) 50vw, 20vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/35" />
                    {/* Top Pill Tag */}
                    <div className="absolute top-2.5 left-2.5 right-2.5">
                      <span className="block text-center px-2 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[9px] font-bold text-white border border-white/25">
                        {suite.title}
                      </span>
                    </div>
                    {/* Bottom Label */}
                    <div className="absolute bottom-2.5 left-2 right-2 text-center text-white">
                      <p className="text-[10px] font-bold text-amber-300">{suite.subtitle}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          VERIFIED CLIENT TESTIMONIALS
      ========================================================================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-12">
        <ScrollReveal variant="fade-up">
          <div className="bg-white rounded-3xl border border-zinc-200/80 p-8 sm:p-12 space-y-8 shadow-xs">
            <div className="text-center max-w-xl mx-auto space-y-2">
              <div className="flex items-center justify-center gap-1 text-amber-400">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <h2 className="text-xl sm:text-3xl font-black text-zinc-900 tracking-tight">
                Loved by Brides & Tastemakers in Accra
              </h2>
              <p className="text-xs text-zinc-500">
                Real feedback from appointments booked through our verified platform.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <ScrollReveal variant="fade-up" delayMs={0}>
                <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3 flex flex-col justify-between h-full">
                  <p className="text-xs text-zinc-700 italic leading-relaxed">
                    &ldquo;Held my bridal glam slot right from my phone and paid with MoMo. The team at East Legon was prompt and stunning.&rdquo;
                  </p>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Akosua Mensah</p>
                    <p className="text-[10px] text-zinc-400">Bride • Airport Residential</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delayMs={150}>
                <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3 flex flex-col justify-between h-full">
                  <p className="text-xs text-zinc-700 italic leading-relaxed">
                    &ldquo;Best frontal melting in Accra! My install lasted over a month with no lifting. Zero waiting time—they start right on the dot.&rdquo;
                  </p>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Nana Yaa Boateng</p>
                    <p className="text-[10px] text-zinc-400">Event Host • East Legon</p>
                  </div>
                </div>
              </ScrollReveal>

              <ScrollReveal variant="fade-up" delayMs={300}>
                <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 space-y-3 flex flex-col justify-between h-full">
                  <p className="text-xs text-zinc-700 italic leading-relaxed">
                    &ldquo;The jelly pedicure and Russian volume lashes in the private VIP suite were pure bliss. Clean, serene, and ultra-hygienic.&rdquo;
                  </p>
                  <div>
                    <p className="text-xs font-bold text-zinc-900">Dr. Evelyn Addo</p>
                    <p className="text-[10px] text-zinc-400">Cantonments, Accra</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
}
