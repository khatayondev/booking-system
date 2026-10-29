"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Calendar, ArrowUpRight } from "lucide-react";

export function PublicNavbar() {
  const pathname = usePathname();

  // On the homepage, the hero starts right at the top with the integrated navbar inside the hero banner
  if (pathname === "/") {
    return null;
  }

  const navLinks = [
    { href: "/our-services", label: "Services & Menu" },
    { href: "/gallery", label: "Lookbook" },
    { href: "/policies", label: "Policies" },
    { href: "/contact", label: "Contact" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#141210]/95 backdrop-blur-md border-b border-white/10 text-white shadow-xl transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3.5 sm:py-4 flex items-center justify-between gap-4">
        {/* Brand Logo - Exact same styling as Homepage */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-white/30 bg-white/10 backdrop-blur-md flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
            <Crown className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <span className="text-white text-xs sm:text-sm font-black tracking-widest uppercase block leading-none">
              GHANA AND BEYOND
            </span>
            <span className="text-[9px] text-zinc-300 tracking-wider block font-medium uppercase mt-0.5">
              East Legon Flagship
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-xs font-semibold">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`transition-colors py-1 ${
                  isActive
                    ? "text-amber-300 font-bold border-b-2 border-amber-300"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Currency, Book Button & Staff Portal */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white backdrop-blur-md">
            <span>🇬🇭</span>
            <span>GHS (GH₵)</span>
          </div>

          <Link href="/book">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 bg-white text-zinc-950 hover:bg-zinc-100 px-4 sm:px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Book Now</span>
            </button>
          </Link>

          <Link href="/login" className="hidden lg:inline-block">
            <button
              type="button"
              className="px-3.5 py-1.5 rounded-full border border-white/25 bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold backdrop-blur-md transition-colors cursor-pointer"
            >
              Staff Portal
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation Strip (Obsidian Dark) */}
      <div className="md:hidden border-t border-white/10 bg-[#141210]/95 px-4 py-2.5 flex items-center justify-around text-[11px] font-semibold text-zinc-300 overflow-x-auto">
        <Link
          href="/"
          className={`whitespace-nowrap px-1.5 py-0.5 rounded-full ${
            pathname === "/" ? "text-amber-300 font-bold bg-white/10" : "hover:text-white"
          }`}
        >
          Home
        </Link>
        <Link
          href="/our-services"
          className={`whitespace-nowrap px-1.5 py-0.5 rounded-full ${
            pathname === "/our-services" ? "text-amber-300 font-bold bg-white/10" : "hover:text-white"
          }`}
        >
          Services
        </Link>
        <Link
          href="/book"
          className={`whitespace-nowrap px-1.5 py-0.5 rounded-full ${
            pathname === "/book" ? "text-amber-300 font-bold bg-white/10" : "hover:text-white"
          }`}
        >
          Book
        </Link>
        <Link
          href="/gallery"
          className={`whitespace-nowrap px-1.5 py-0.5 rounded-full ${
            pathname === "/gallery" ? "text-amber-300 font-bold bg-white/10" : "hover:text-white"
          }`}
        >
          Lookbook
        </Link>
        <Link
          href="/policies"
          className={`whitespace-nowrap px-1.5 py-0.5 rounded-full ${
            pathname === "/policies" ? "text-amber-300 font-bold bg-white/10" : "hover:text-white"
          }`}
        >
          Policies
        </Link>
        <Link
          href="/contact"
          className={`whitespace-nowrap px-1.5 py-0.5 rounded-full ${
            pathname === "/contact" ? "text-amber-300 font-bold bg-white/10" : "hover:text-white"
          }`}
        >
          Contact
        </Link>
      </div>
    </header>
  );
}
