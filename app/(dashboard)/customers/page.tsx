import * as React from "react";
import { CustomersClient } from "./customers-client";

export const instant = false;

export default function CustomersPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-zinc-400">Loading customers...</div>}>
      <CustomersClient />
    </React.Suspense>
  );
}
