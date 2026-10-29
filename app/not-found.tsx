import Link from "next/link";
import { Crown, Home, Calendar } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-[#1E1E1E]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-[#E4E4E7] text-center space-y-6">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-3xl bg-[#1E1E1E] text-white mx-auto flex items-center justify-center shadow-md">
          <Crown className="w-8 h-8 text-amber-300" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#F4F4F6] text-[#71717A] uppercase tracking-wider">
            Error 404
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1E1E]">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed">
            The page or appointment link you are looking for has been moved, rescheduled, or does not exist.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold bg-[#1E1E1E] text-white hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
          <Link
            href="/book"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#E4E4E7] text-[#1E1E1E] hover:bg-[#F4F4F6] transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Calendar className="w-4 h-4" />
            <span>Book Appointment</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
