"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Calendar, ArrowUpRight } from "lucide-react";

export function PublicNavbar() {
  const pathname = usePathname();

  // On the homepage (integrated hero navbar) and booking wizard (dedicated full-screen funnel), hide the global navbar
  if (pathname === "/" || pathname === "/book") {
    return null;
  }

  const navLinks = [
    { href: "/our-services", label: "Services & Menu" },
    { href: "/gallery", label: "Lookbook" },
    { href: "/policies", label: "Policies" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-transparent transition-all pointer-events-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3.5 sm:py-4 flex items-center justify-between gap-4 pointer-events-auto">
        {/* Brand Logo in Floating Capsule */}
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full bg-zinc-950/90 hover:bg-zinc-950 border border-zinc-800 text-white backdrop-blur-md shadow-lg group transition-all"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-white/10 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Crown className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <div>
            <span className="text-white text-xs sm:text-sm font-black tracking-widest uppercase block leading-none">
              GHANA AND BEYOND
            </span>
            <span className="text-[8px] sm:text-[9px] text-zinc-300 tracking-wider block font-medium uppercase mt-0.5">
              East Legon Flagship
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links in Floating Capsules */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-3 text-xs font-semibold">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full backdrop-blur-md transition-all duration-200 shadow-md flex items-center justify-center ${
                  isActive
                    ? "bg-white text-zinc-950 font-bold shadow-xl scale-105 border border-zinc-200"
                    : "bg-zinc-950/90 hover:bg-zinc-950 text-zinc-300 hover:text-white border border-zinc-800 hover:scale-105 active:scale-95"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Currency, Book Button & Staff Portal in Floating Capsules */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-950/90 border border-zinc-800 text-[10px] font-bold text-white backdrop-blur-md shadow-lg">
            <span>🇬🇭</span>
            <span>GHS (GH₵)</span>
          </div>

          <Link href="/book">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-zinc-950 text-white hover:bg-black border border-zinc-800 px-4 sm:px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer hover:scale-105"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Book Now</span>
            </button>
          </Link>

          <Link href="/login" className="hidden lg:inline-block">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full border border-zinc-800 bg-zinc-950/90 hover:bg-zinc-950 text-white text-[11px] font-semibold backdrop-blur-md transition-colors cursor-pointer shadow-lg hover:scale-105"
            >
              Staff Portal
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation Floating Capsules Directly on Page Background */}
      <div className="md:hidden bg-transparent px-4 py-2 flex items-center gap-2 text-[11px] font-semibold overflow-x-auto scrollbar-none pointer-events-auto">
        <Link
          href="/"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all backdrop-blur-md shadow-md ${
            pathname === "/"
              ? "bg-white text-zinc-950 font-bold border border-zinc-200"
              : "bg-zinc-950/90 text-white/90 hover:text-white border border-zinc-800"
          }`}
        >
          Home
        </Link>
        <Link
          href="/our-services"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all backdrop-blur-md shadow-md ${
            pathname === "/our-services"
              ? "bg-white text-zinc-950 font-bold border border-zinc-200"
              : "bg-zinc-950/90 text-white/90 hover:text-white border border-zinc-800"
          }`}
        >
          Services
        </Link>
        <Link
          href="/book"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all backdrop-blur-md shadow-md ${
            pathname === "/book"
              ? "bg-white text-zinc-950 font-bold border border-zinc-200"
              : "bg-zinc-950/90 text-white/90 hover:text-white border border-zinc-800"
          }`}
        >
          Book
        </Link>
        <Link
          href="/gallery"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all backdrop-blur-md shadow-md ${
            pathname === "/gallery"
              ? "bg-white text-zinc-950 font-bold border border-zinc-200"
              : "bg-zinc-950/90 text-white/90 hover:text-white border border-zinc-800"
          }`}
        >
          Lookbook
        </Link>
        <Link
          href="/policies"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all backdrop-blur-md shadow-md ${
            pathname === "/policies"
              ? "bg-white text-zinc-950 font-bold border border-zinc-200"
              : "bg-zinc-950/90 text-white/90 hover:text-white border border-zinc-800"
          }`}
        >
          Policies
        </Link>
        <Link
          href="/contact"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all backdrop-blur-md shadow-md ${
            pathname === "/contact"
              ? "bg-white text-zinc-950 font-bold border border-zinc-200"
              : "bg-zinc-950/90 text-white/90 hover:text-white border border-zinc-800"
          }`}
        >
          Contact
        </Link>
      </div>
    </header>
  );
}
