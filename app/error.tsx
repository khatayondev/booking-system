"use client";

import * as React from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Log error to console
    console.error("Application error boundary caught error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-[#1E1E1E]">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-[#E4E4E7] text-center space-y-6">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center shadow-xs border border-rose-100">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 uppercase tracking-wider">
            System Error
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight text-[#1E1E1E]">
            Something went wrong
          </h1>
          <p className="text-xs sm:text-sm text-[#71717A] leading-relaxed">
            An unexpected error occurred while processing your request. Our monitoring team has been notified.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-[#A1A1AA]">
              Error ID: {error.digest}
            </p>
          )}
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="blackPill"
            size="sm"
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>
          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-semibold bg-white border border-[#E4E4E7] text-[#1E1E1E] hover:bg-[#F4F4F6] transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <Home className="w-4 h-4" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
