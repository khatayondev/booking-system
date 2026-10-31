"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./auth-context";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldAlert, LayoutDashboard, Calendar, ArrowLeft } from "lucide-react";
import { UserRole } from "@/lib/rbac";

interface RoleGuardProps {
  children: React.ReactNode;
  requiredPermission?: string;
  allowedRoles?: UserRole[];
  pageTitle?: string;
  activePath?: string;
}

export function RoleGuard({
  children,
  requiredPermission,
  allowedRoles,
  pageTitle = "Restricted Access",
  activePath,
}: RoleGuardProps) {
  const { user, loading, hasPermission, hasRole } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <AppShell activePath={activePath}>
        <div className="p-8 max-w-4xl mx-auto space-y-6 animate-pulse">
          <div className="h-10 bg-black/5 rounded-2xl w-1/3" />
          <div className="h-64 bg-black/5 rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  // Check role & permission
  const roleAllowed = !allowedRoles || (user && hasRole(allowedRoles));
  const permAllowed = !requiredPermission || (user && hasPermission(requiredPermission));

  if (!user || !roleAllowed || !permAllowed) {
    const roleTitle =
      user?.role === "STAFF_RECEPTIONIST"
        ? "Front Desk • Receptionist"
        : user?.role === "MANAGER"
        ? "Studio Manager"
        : user?.role === "OWNER_ADMIN"
        ? "Studio Owner"
        : "Guest";

    const allowedRolesText =
      allowedRoles && allowedRoles.length > 0
        ? allowedRoles
            .map((r) =>
              r === "OWNER_ADMIN"
                ? "Studio Owner & Admin"
                : r === "MANAGER"
                ? "Studio Manager"
                : "Front Desk"
            )
            .join(" or ")
        : "Studio Owner & Admin";

    return (
      <AppShell activePath={activePath}>
        <div className="min-h-[70vh] flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-8 text-center bg-white border border-[#E4E4E7] shadow-xl rounded-3xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-5 text-amber-600 shadow-xs">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-[11px] font-bold uppercase tracking-wider mb-3">
              Access Restricted
            </span>

            <h2 className="text-xl font-extrabold text-[#1E1E1E] tracking-tight mb-2">
              {pageTitle}
            </h2>

            <p className="text-xs text-[#71717A] leading-relaxed mb-6">
              Your account role (<span className="font-bold text-[#1E1E1E]">{roleTitle}</span>) is not permitted to access this administrative section.
            </p>

            <div className="p-4 rounded-2xl bg-[#F4F4F6] text-xs text-[#71717A] text-left space-y-1.5 mb-6 border border-[#E4E4E7]/60">
              <p className="font-bold text-[#1E1E1E]">Authorized Roles:</p>
              <p className="text-zinc-600">{allowedRolesText}</p>
              <p className="text-[11px] text-zinc-500 pt-1 border-t border-[#E4E4E7]/60">
                If you require access to this section, please speak with Akosua Addo (Studio Owner).
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <Button
                variant="blackPill"
                size="md"
                className="w-full sm:w-auto text-xs gap-1.5 cursor-pointer"
                onClick={() => router.push("/dashboard")}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Return to Dashboard</span>
              </Button>
              <Button
                variant="outlinePill"
                size="md"
                className="w-full sm:w-auto text-xs gap-1.5 cursor-pointer"
                onClick={() => router.push("/bookings")}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Go to Bookings</span>
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return <>{children}</>;
}
