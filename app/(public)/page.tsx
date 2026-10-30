"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowDownRight,
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Star,
  Crown,
  Menu,
  X,
  Calendar,
  Heart,
  ShoppingBag,
  Search,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

const HERO_HOTSPOTS = [
  {
    id: "bya" as const,
    name: "Bya",
    tagline: "Japan style soft knotless",
    price: "GH₵ 350.00",
    serviceId: "834b6107-a2b3-4742-ab1f-fa6e4a6e3d10",
    colors: [
      { name: "Warm Amber", hex: "#F59E0B" },
      { name: "Emerald Glaze", hex: "#14B8A6" },
      { name: "Graphite Noir", hex: "#4B5563" },
    ],
    pinStyle: { top: "67%", left: "23%" },
  },
  {
    id: "melt" as const,
    name: "Melt",
    tagline: "HD lace frontal installation",
    price: "GH₵ 200.00",
    serviceId: "a80c50b6-6f94-4aaa-8cff-d7558ffce78d",
    colors: [
      { name: "Natural 1B", hex: "#1F2937" },
      { name: "Honey Caramel", hex: "#D97706" },
      { name: "Chestnut", hex: "#78350F" },
    ],
    pinStyle: { top: "68%", left: "59%" },
  },
  {
    id: "lashes" as const,
    name: "Volume",
    tagline: "Russian fluffy mega fan lashes",
    price: "GH₵ 260.00",
    serviceId: "9731e67c-88bf-4124-ac04-3b3a1a1140d4",
    colors: [
      { name: "Midnight Black", hex: "#111827" },
      { name: "Soft Mink", hex: "#4B5563" },
      { name: "Espresso Tint", hex: "#37271E" },
    ],
    pinStyle: { top: "41%", left: "80%" },
  },
];

const ALL_SIGNATURE_TREATMENTS = [
  {
    id: "a80c50b6-6f94-4aaa-8cff-d7558ffce78d",
    title: "Full Frontal Lace Installation",
    category: "HAIR & INSTALLS",
    rate: "GH₵ 160.00",
    duration: "90 min",
    image: "/images/ghanaian_hair_install.jpg",
    description: "Bleaching of knots, hairline customization, melting band press & precision sleek styling.",
  },
  {
    id: "fbfb4850-4a54-43f1-97ef-f6833a296bc4",
    title: "Bridal Soft Glam Makeup",
    category: "BRIDAL GLAM",
    rate: "GH₵ 550.00",
    duration: "90 min",
    image: "/images/ghanaian_bridal_glam.jpg",
    description: "Camera-ready HD soft contour, skin glaze prep, handcrafted lash fan & 24hr sealing setting spray.",
  },
  {
    id: "9731e67c-88bf-4124-ac04-3b3a1a1140d4",
    title: "Mega Volume Russian Lashes",
    category: "LASHES",
    rate: "GH₵ 260.00",
    duration: "120 min",
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
    id: "a0c6bda1-c2bb-45db-a5df-6f527e977f6b",
    title: "Frontal Sleek High Pony",
    category: "HAIR & INSTALLS",
    rate: "GH₵ 200.00",
    duration: "150 min",
    image: "/images/ghanaian_hero_beauty.jpg",
    description: "High tension sculpted sleek ponytail with customized ear-to-ear lace frontal melting.",
  },
  {
    id: "834b6107-a2b3-4742-ab1f-fa6e4a6e3d10",
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
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [activeHotspotId, setActiveHotspotId] = React.useState<"bya" | "melt" | "lashes">("bya");
  const [selectedColorIndex, setSelectedColorIndex] = React.useState<number>(0);
  const [liked, setLiked] = React.useState(false);

  const activeHotspot = React.useMemo(() => {
    return HERO_HOTSPOTS.find((h) => h.id === activeHotspotId) || HERO_HOTSPOTS[0];
  }, [activeHotspotId]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/our-services?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      router.push("/our-services");
    }
  };

  // Lock body scroll when mobile menu is open
  React.useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

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
          HERO SECTION (Minimalistic & Modern Minimalist Studio with Hotspots & Glass Card)
      ========================================================================= */}
      <section className="w-full max-w-full overflow-x-hidden p-0 bg-zinc-950">
        <div className="relative w-full overflow-hidden shadow-2xl bg-[#18191c] flex flex-col justify-between min-h-[740px] sm:min-h-[820px] lg:min-h-[880px]">
          {/* Minimalist Studio Interior Background (Deep graphite wall with amber sofa) */}
          <div className="absolute inset-0 z-0">
            <Image
              src="/images/minimalist_studio_hero.jpg"
              alt="Becca's Crown Beauty Vault Minimalist Studio"
              fill
              priority
              className="object-cover object-bottom scale-100"
            />
            {/* Ambient Vignette for Crisp Contrast */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/25 to-black/35" />
          </div>

          {/* ===================================================================
              NAVBAR (Sleek, Minimalist, Floating at Top matching reference)
          =================================================================== */}
          <header className="relative z-30 w-full px-5 sm:px-10 lg:px-14 pt-6 sm:pt-8 pb-3">
            <div className="flex items-center justify-between gap-6 max-w-7xl mx-auto">
              {/* Brand Logo in Clean Modern Sans-Serif */}
              <Link
                href="/"
                className="flex items-center gap-2 group cursor-pointer"
              >
                <span className="text-white text-xl sm:text-2xl font-black tracking-tight group-hover:text-zinc-200 transition-colors">
                  Becca&apos;s Crown
                </span>
              </Link>

              {/* Center Navigation Links matching reference */}
              <nav className="hidden md:flex items-center gap-7 lg:gap-10 text-xs sm:text-sm font-medium">
                <Link
                  href="/our-services"
                  className="text-white/75 hover:text-white transition-colors cursor-pointer"
                >
                  Treatments
                </Link>
                <Link
                  href="/gallery"
                  className="text-white/75 hover:text-white transition-colors cursor-pointer"
                >
                  Lookbook
                </Link>
                <Link
                  href="/contact"
                  className="text-white/75 hover:text-white transition-colors cursor-pointer"
                >
                  About Us
                </Link>
                <Link
                  href="/policies"
                  className="text-white/75 hover:text-white transition-colors cursor-pointer"
                >
                  Policies
                </Link>
                <Link
                  href="/contact"
                  className="text-white/75 hover:text-white transition-colors cursor-pointer"
                >
                  Contact
                </Link>
              </nav>

              {/* Right Icons: Heart, Bag & Staff Portal */}
              <div className="flex items-center gap-4 sm:gap-6">
                {/* Wishlist / Heart */}
                <button
                  type="button"
                  onClick={() => setLiked(!liked)}
                  className="text-white/80 hover:text-white transition-colors cursor-pointer active:scale-90"
                  aria-label="Wishlist"
                >
                  <Heart
                    className={`w-5 h-5 transition-all ${
                      liked ? "fill-red-500 text-red-500 scale-110" : "text-white/80 hover:text-white"
                    }`}
                  />
                </button>

                {/* Shopping Bag / Quick Book */}
                <Link
                  href="/book"
                  className="text-white/80 hover:text-white transition-colors cursor-pointer relative active:scale-95"
                  aria-label="Book an appointment"
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400" />
                </Link>

                {/* Staff Subdomain Portal */}
                <Link
                  href="https://dashboard.beccascrownbeauty.com"
                  className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-full border border-white/20 bg-white/5 hover:bg-white/10 text-white text-[11px] font-semibold transition-all cursor-pointer"
                >
                  Staff
                </Link>

                {/* Mobile Menu Toggle */}
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden text-white/90 hover:text-white transition-colors cursor-pointer p-1"
                  aria-label="Toggle navigation menu"
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </header>

          {/* Mobile Drawer Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-start">
              <div
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity"
                onClick={() => setMobileMenuOpen(false)}
                aria-hidden="true"
              />
              <div className="relative z-10 bg-[#141210]/95 backdrop-blur-2xl border-b border-white/15 shadow-2xl rounded-b-3xl p-5 pt-5 space-y-5 animate-in slide-in-from-top-4 duration-200 text-white">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2"
                  >
                    <span className="text-white text-base font-bold tracking-tight">
                      Becca&apos;s Crown
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white active:scale-90 transition-all"
                    aria-label="Close menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <nav className="flex flex-col gap-1.5">
                  <Link
                    href="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between bg-white/10 text-white shadow-xs"
                  >
                    <span>Home</span>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </Link>
                  <Link
                    href="/our-services"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between hover:bg-white/10 text-zinc-200 hover:text-white"
                  >
                    <span>Treatments</span>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </Link>
                  <Link
                    href="/gallery"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between hover:bg-white/10 text-zinc-200 hover:text-white"
                  >
                    <span>Lookbook</span>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </Link>
                  <Link
                    href="/policies"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between hover:bg-white/10 text-zinc-200 hover:text-white"
                  >
                    <span>Policies</span>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </Link>
                  <Link
                    href="/contact"
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between hover:bg-white/10 text-zinc-200 hover:text-white"
                  >
                    <span>Contact</span>
                    <ArrowRight className="w-4 h-4 opacity-50" />
                  </Link>
                </nav>

                <div className="pt-2 border-t border-white/10 space-y-2.5">
                  <Link href="/book" onClick={() => setMobileMenuOpen(false)}>
                    <button
                      type="button"
                      className="w-full bg-amber-400 hover:bg-amber-300 text-black font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg cursor-pointer active:scale-95 transition-transform"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Book Appointment</span>
                    </button>
                  </Link>
                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 px-1">
                    <span className="font-semibold text-[11px]">🇬🇭 Ghana • GHS (GH₵)</span>
                    <Link
                      href="https://dashboard.beccascrownbeauty.com"
                      onClick={() => setMobileMenuOpen(false)}
                      className="font-bold text-[11px] text-zinc-300 hover:text-white"
                    >
                      Staff Portal →
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ===================================================================
              CENTER EDITORIAL TYPOGRAPHY & PILL SEARCH BAR
          =================================================================== */}
          <div className="relative z-10 px-4 sm:px-6 pt-10 sm:pt-14 pb-48 sm:pb-56 text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.08]">
              Our artistry is
              <br />
              minimalistic &amp; modern
            </h1>

            <p className="mt-4 sm:mt-5 text-xs sm:text-sm lg:text-base text-zinc-300 max-w-xl mx-auto font-normal leading-relaxed">
              We will be able to provide you with the best beauty experience
              from the master artisans at Becca&apos;s Crown Beauty Vault
            </p>

            {/* Pill Search Bar matching reference */}
            <form
              onSubmit={handleSearchSubmit}
              className="mt-6 sm:mt-8 max-w-md sm:max-w-lg mx-auto relative px-2"
            >
              <div className="relative flex items-center rounded-full border border-white/25 bg-black/35 backdrop-blur-md shadow-2xl px-5 py-3 transition-all focus-within:border-white/50 focus-within:bg-black/55">
                <input
                  type="text"
                  placeholder="Search for materials, styles, braids, lashes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-zinc-400 focus:outline-none pr-12"
                />
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-2.5 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center transition-transform hover:scale-105 active:scale-95 shadow-md cursor-pointer"
                >
                  <Search className="w-4 h-4 text-black stroke-[2.5]" />
                </button>
              </div>
            </form>
          </div>

          {/* ===================================================================
              FLOATING GLASSMORPHIC PRODUCT CARD & INTERACTIVE HOTSPOTS
          =================================================================== */}
          {/* Glassmorphic Product Card (pinned to left sofa side) */}
          <div className="absolute top-[43%] sm:top-[46%] left-4 sm:left-10 lg:left-16 z-20 w-56 sm:w-64 rounded-2xl bg-black/45 backdrop-blur-xl border border-white/20 p-4 sm:p-5 shadow-2xl text-white transition-all duration-300">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight leading-tight">
                  {activeHotspot.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-300 capitalize mt-0.5 font-normal">
                  {activeHotspot.tagline}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-sm sm:text-base font-extrabold text-white">
                  {activeHotspot.price}
                </span>
              </div>
            </div>

            <div className="my-3 border-t border-white/15" />

            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-300 font-medium">Color</span>
              <div className="flex items-center gap-2">
                {activeHotspot.colors.map((c, idx) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedColorIndex(idx)}
                    className={`w-4 h-4 sm:w-4.5 sm:h-4.5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      selectedColorIndex === idx
                        ? "ring-2 ring-white scale-110 shadow-sm"
                        : "opacity-75 hover:opacity-100"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    title={c.name}
                    aria-label={c.name}
                  >
                    {selectedColorIndex === idx && (
                      <Check className="w-2.5 h-2.5 text-black stroke-[3.5]" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Link
              href={`/book?serviceId=${activeHotspot.serviceId}&step=2`}
              className="mt-3.5 block"
            >
              <button
                type="button"
                className="w-full py-2 px-3 rounded-xl bg-white hover:bg-amber-300 text-zinc-950 font-black text-[11px] uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5 shadow-md cursor-pointer active:scale-95"
              >
                <span>Book This Style</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </Link>
          </div>

          {/* Interactive Hotspot Pins across the Sofa */}
          {HERO_HOTSPOTS.map((spot) => {
            const isActive = activeHotspotId === spot.id;
            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => {
                  setActiveHotspotId(spot.id);
                  setSelectedColorIndex(0);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 group cursor-pointer focus:outline-none"
                style={spot.pinStyle}
                aria-label={`Select ${spot.name}`}
              >
                <span className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9">
                  <span
                    className={`absolute inline-flex h-full w-full rounded-full bg-white/40 ${
                      isActive ? "animate-ping opacity-80" : "opacity-30 group-hover:opacity-75"
                    }`}
                  />
                  <span
                    className={`relative inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border border-white/80 backdrop-blur-sm transition-transform duration-200 ${
                      isActive
                        ? "bg-white/40 scale-110 shadow-lg ring-2 ring-white/60"
                        : "bg-white/20 group-hover:scale-110 group-hover:bg-white/30"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-white shadow-xs" />
                  </span>
                </span>
              </button>
            );
          })}
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
                <Link href="/book?serviceId=a80c50b6-6f94-4aaa-8cff-d7558ffce78d&step=2">
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
                <Link href="/book?serviceId=fbfb4850-4a54-43f1-97ef-f6833a296bc4&step=2">
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
                <Link href="/book?serviceId=9731e67c-88bf-4124-ac04-3b3a1a1140d4&step=2">
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
