"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PublicNavbar() {
  const pathname = usePathname();

  // On the homepage, the hero starts right at the top with the integrated navbar inside the thick white outline
  if (pathname === "/") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-black/5 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-[#1E1E1E] text-white flex items-center justify-center font-bold shadow-xs group-hover:scale-105 transition-transform">
            <Crown className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <span className="text-sm sm:text-base font-black text-[#1E1E1E] tracking-tight block">
              BECCA&apos;S CROWN
            </span>
            <span className="text-[10px] text-[#71717A] tracking-wider block font-semibold uppercase">
              Beauty Vault • East Legon
            </span>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-[#52525B]">
          <Link href="/" className="hover:text-black transition-colors">
            Home
          </Link>
          <Link href="/our-services" className="hover:text-black transition-colors">
            Services & Menu
          </Link>
          <Link href="/gallery" className="hover:text-black transition-colors">
            Transformations
          </Link>
          <Link href="/policies" className="hover:text-black transition-colors">
            Policies
          </Link>
          <Link href="/contact" className="hover:text-black transition-colors">
            Contact
          </Link>
        </nav>

        {/* Right Action Buttons */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200/80 text-[11px] font-bold text-zinc-800">
            <span>🇬🇭</span>
            <span>GHS (GH₵)</span>
          </div>

          <Link href="/book">
            <Button
              size="sm"
              className="bg-[#1E1E1E] text-white hover:bg-black rounded-full text-xs h-9 px-4 sm:px-5 gap-1.5 shadow-sm cursor-pointer font-bold"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-300" />
              <span>Book Appointment</span>
            </Button>
          </Link>

          <Link href="/login" className="hidden lg:inline-block">
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
      <div className="md:hidden border-t border-black/5 bg-white/95 px-4 py-2 flex items-center justify-around text-[11px] font-semibold text-[#71717A] overflow-x-auto">
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
  );
}

