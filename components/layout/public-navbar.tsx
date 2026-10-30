"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Calendar, Menu, X, ArrowRight } from "lucide-react";

export function PublicNavbar() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

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

  // On the homepage (integrated hero navbar), hide the global navbar
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
    <>
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
                BECCA&apos;S CROWN
              </span>
              <span className="text-[8px] sm:text-[9px] text-amber-600 font-bold tracking-wider block uppercase mt-0.5">
                Beauty Vault
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

          {/* Right Side: Currency, Book Button & Staff Portal */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="apple-glass-pill-light hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-extrabold text-zinc-800">
              <span>🇬🇭</span>
              <span>GHS (GH₵)</span>
            </div>

            <Link href="/book" className="hidden sm:inline-block">
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

            {/* Mobile Regular Burger Icon Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden apple-glass-pill-light w-10 h-10 rounded-full flex items-center justify-center text-zinc-900 hover:text-black active:scale-90 transition-all cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer / Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-start">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Sliding Menu Panel */}
          <div className="relative z-10 bg-white/95 backdrop-blur-xl border-b border-zinc-200/80 shadow-2xl rounded-b-3xl p-5 pt-4 space-y-5 animate-in slide-in-from-top-4 duration-200">
            {/* Top Bar inside Menu */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5"
              >
                <div className="w-7 h-7 rounded-full bg-black/5 border border-black/10 flex items-center justify-center text-zinc-900">
                  <Crown className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div>
                  <span className="text-zinc-900 text-xs font-black tracking-widest uppercase block leading-none">
                    BECCA&apos;S CROWN
                  </span>
                  <span className="text-[8px] text-amber-600 font-bold tracking-wider block uppercase mt-0.5">
                    Beauty Vault
                  </span>
                </div>
              </Link>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-700 active:scale-90 transition-all"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Navigation Links */}
            <nav className="flex flex-col gap-1.5">
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-between ${
                  pathname === "/"
                    ? "bg-[#1E1E1E] text-white shadow-sm"
                    : "hover:bg-zinc-100 text-zinc-800"
                }`}
              >
                <span>Home</span>
                <ArrowRight className="w-4 h-4 opacity-40" />
              </Link>
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-between ${
                      isActive
                        ? "bg-[#1E1E1E] text-white shadow-sm"
                        : "hover:bg-zinc-100 text-zinc-800"
                    }`}
                  >
                    <span>{link.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-40" />
                  </Link>
                );
              })}
            </nav>

            {/* Actions: Book Now & Staff Portal */}
            <div className="pt-2 border-t border-zinc-100 space-y-2.5">
              <Link href="/book" onClick={() => setMobileMenuOpen(false)}>
                <button
                  type="button"
                  className="w-full bg-[#FACC15] hover:bg-[#EAB308] text-black font-extrabold py-3.5 rounded-2xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md cursor-pointer active:scale-95 transition-transform"
                >
                  <Calendar className="w-4 h-4" />
                  <span>Book Appointment</span>
                </button>
              </Link>

              <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 px-1">
                <span className="font-semibold text-[11px]">🇬🇭 Ghana • GHS (GH₵)</span>
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-bold text-[11px] text-zinc-800 hover:text-black"
                >
                  Staff Portal →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
