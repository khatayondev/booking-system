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
      <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 py-3 sm:py-4 flex items-center justify-between gap-4 pointer-events-auto">
        {/* Brand Logo in Apple Liquid Glass Capsule */}
        <Link
          href="/"
          className="apple-glass-pill-light flex items-center gap-2.5 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full group cursor-pointer hover:scale-105 active:scale-95"
        >
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-zinc-900 group-hover:scale-105 transition-transform">
            <Crown className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div>
            <span className="text-zinc-900 text-xs sm:text-sm font-black tracking-widest uppercase block leading-none">
              GHANA AND BEYOND
            </span>
            <span className="text-[8px] sm:text-[9px] text-zinc-500 tracking-wider block font-medium uppercase mt-0.5">
              East Legon Flagship
            </span>
          </div>
        </Link>

        {/* Center Desktop Navigation Links in Apple Liquid Glass Capsules */}
        <nav className="hidden md:flex items-center gap-2 lg:gap-3 text-xs font-semibold">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  isActive
                    ? "apple-glass-pill-light-active scale-105"
                    : "apple-glass-pill-light hover:scale-105 active:scale-95 text-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Side: Currency, Book Button & Staff Portal in Liquid Glass Capsules */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="apple-glass-pill-light hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold text-zinc-800">
            <span>🇬🇭</span>
            <span>GHS (GH₵)</span>
          </div>

          <Link href="/book">
            <button
              type="button"
              className="apple-glass-pill-light-active inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all active:scale-95 cursor-pointer hover:scale-105"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Book Now</span>
            </button>
          </Link>

          <Link href="/login" className="hidden lg:inline-block">
            <button
              type="button"
              className="apple-glass-pill-light px-3.5 py-1.5 rounded-full text-zinc-700 hover:text-black text-[11px] font-bold transition-all cursor-pointer hover:scale-105 active:scale-95"
            >
              Staff Portal
            </button>
          </Link>
        </div>
      </div>

      {/* Mobile Navigation Floating Capsules Directly on Page Background */}
      <div className="md:hidden bg-transparent px-3 py-2 flex items-center gap-2 text-[11px] font-bold overflow-x-auto scrollbar-none pointer-events-auto">
        <Link
          href="/"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
            pathname === "/"
              ? "apple-glass-pill-light-active"
              : "apple-glass-pill-light text-zinc-800"
          }`}
        >
          Home
        </Link>
        <Link
          href="/our-services"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
            pathname === "/our-services"
              ? "apple-glass-pill-light-active"
              : "apple-glass-pill-light text-zinc-800"
          }`}
        >
          Services
        </Link>
        <Link
          href="/book"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
            pathname === "/book"
              ? "apple-glass-pill-light-active"
              : "apple-glass-pill-light text-zinc-800"
          }`}
        >
          Book
        </Link>
        <Link
          href="/gallery"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
            pathname === "/gallery"
              ? "apple-glass-pill-light-active"
              : "apple-glass-pill-light text-zinc-800"
          }`}
        >
          Lookbook
        </Link>
        <Link
          href="/policies"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
            pathname === "/policies"
              ? "apple-glass-pill-light-active"
              : "apple-glass-pill-light text-zinc-800"
          }`}
        >
          Policies
        </Link>
        <Link
          href="/contact"
          className={`whitespace-nowrap px-3.5 py-1.5 rounded-full transition-all cursor-pointer ${
            pathname === "/contact"
              ? "apple-glass-pill-light-active"
              : "apple-glass-pill-light text-zinc-800"
          }`}
        >
          Contact
        </Link>
      </div>
    </header>
  );
}
