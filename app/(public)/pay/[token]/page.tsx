import { Suspense } from "react";
import { PublicPaymentRequestClient } from "./pay-page-client";

export const instant = false;

export default async function PublicPaymentRequestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0E0E10] text-zinc-100 flex items-center justify-center p-4">
          <div className="text-center space-y-4">
            <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-zinc-400 font-medium">Securing payment connection...</p>
          </div>
        </div>
      }
    >
      <PublicPaymentRequestClient token={token} />
    </Suspense>
  );
}
