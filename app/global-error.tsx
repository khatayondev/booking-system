"use client";

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    console.error("Global critical error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6 text-[#1E1E1E] font-sans antialiased">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 shadow-xl border border-[#E4E4E7] text-center space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center shadow-xs border border-rose-100">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#1E1E1E]">
              Critical Application Error
            </h1>
            <p className="text-xs text-[#71717A] leading-relaxed">
              We encountered a critical runtime error. Please reload the application.
            </p>
            {error.digest && (
              <p className="font-mono text-[10px] text-[#A1A1AA]">
                Digest: {error.digest}
              </p>
            )}
          </div>

          <div>
            <button
              onClick={() => reset()}
              className="px-6 py-2.5 rounded-full text-xs font-semibold bg-[#1E1E1E] text-white hover:bg-black transition-all inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
