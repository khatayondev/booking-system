"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Lock, ArrowRight, ShieldCheck, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label, Input } from "@/components/ui/controls";

function StaffLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const [identifier, setIdentifier] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [totpCode, setTotpCode] = React.useState("");
  const [requiresTotp, setRequiresTotp] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Forced password change modal
  const [mustChangePassword, setMustChangePassword] = React.useState(false);
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordChangeLoading, setPasswordChangeLoading] = React.useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
          totpCode: requiresTotp ? totpCode.trim() : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json?.error?.message || "Invalid credentials. Please verify your details.");
        return;
      }

      if (json.data?.requiresTotp) {
        setRequiresTotp(true);
        setError(null);
        return;
      }

      if (json.data?.requiresPasswordChange) {
        setMustChangePassword(true);
        return;
      }

      router.push(redirectTarget);
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setPasswordChangeLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json?.error?.message || "Failed to update password.");
        return;
      }

      router.push(redirectTarget);
      router.refresh();
    } catch {
      setError("An error occurred while updating your password.");
    } finally {
      setPasswordChangeLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-swirl">
      <div className="w-full max-w-md">
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-[#1E1E1E] text-white flex items-center justify-center mx-auto mb-3 shadow-md">
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#1E1E1E] tracking-tight">
            Staff Portal
          </h1>
          <p className="text-xs text-[#71717A] mt-1">
            Aura Beauty &amp; Fashion Studio • Accra, Ghana
          </p>
        </div>

        {/* Login or First-Login Password Change Card */}
        <Card variant="glass" className="p-8 shadow-xl">
          {error && (
            <div className="p-3.5 mb-5 rounded-2xl bg-[#FEF2F2] border border-[#FEE2E2] text-xs font-semibold text-[#991B1B]">
              {error}
            </div>
          )}

          {!mustChangePassword ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="identifier">Email or Ghana Phone</Label>
                <Input
                  id="identifier"
                  type="text"
                  placeholder="owner@aurastudio.gh or 024 111 2233"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  disabled={loading || requiresTotp}
                  autoComplete="username"
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading || requiresTotp}
                  autoComplete="current-password"
                />
              </div>

              {requiresTotp && (
                <div className="pt-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2 mb-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#1E1E1E]" />
                    <Label htmlFor="totpCode">Two-Factor Authentication Code</Label>
                  </div>
                  <Input
                    id="totpCode"
                    type="text"
                    inputMode="numeric"
                    placeholder="6-digit authenticator code"
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    required
                    maxLength={6}
                    autoFocus
                  />
                  <p className="text-[11px] text-[#71717A] mt-1">
                    Enter the code from your Google Authenticator or 1Password app.
                  </p>
                </div>
              )}

              <Button
                type="submit"
                variant="blackPill"
                size="md"
                className="w-full mt-2 gap-2 shadow-sm"
                disabled={loading}
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : requiresTotp ? (
                  <>
                    <span>Verify Code</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#FFFBEB] border border-[#FEF3C7] text-xs font-medium text-[#92400E]">
                <KeyRound className="w-4 h-4 shrink-0" />
                <span>Security Notice: You must set a new password on your first login.</span>
              </div>

              <div>
                <Label htmlFor="newPassword">New Password (8+ characters)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••••••"
                />
              </div>

              <Button
                type="submit"
                variant="blackPill"
                size="md"
                className="w-full mt-2"
                disabled={passwordChangeLoading}
              >
                {passwordChangeLoading ? "Updating..." : "Update Password & Continue"}
              </Button>
            </form>
          )}

          <div className="pt-6 mt-6 border-t border-black/5 text-center text-xs text-[#71717A]">
            <p>Customers do not need accounts to book.</p>
            <p className="mt-1">
              Authorized salon personnel only. All access attempts are audit logged.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default function StaffLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-swirl flex items-center justify-center text-xs text-[#71717A]">
          Loading portal...
        </div>
      }
    >
      <StaffLoginForm />
    </React.Suspense>
  );
}

