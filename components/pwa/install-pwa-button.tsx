"use client";

import * as React from "react";
import { Download, Share2, PlusSquare, Smartphone, Laptop, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog-and-drawer";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallPwaButton({
  variant = "sidebar",
  className,
}: {
  variant?: "sidebar" | "header" | "mobile";
  className?: string;
}) {
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = React.useState(false);
  const [isIosOrIpad, setIsIosOrIpad] = React.useState(false);
  const [showIosInstructions, setShowIosInstructions] = React.useState(false);
  const [installedSuccess, setInstalledSuccess] = React.useState(false);

  React.useEffect(() => {
    // 1. Check if already running as installed standalone app
    const isStandaloneMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    setIsStandalone(isStandaloneMode);

    // 2. Check for iOS / iPadOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIos =
      /iphone|ipad|ipod/.test(userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1); // iPad Safari masquerades as MacIntel

    setIsIosOrIpad(isIos);

    // 3. Listen for browser install prompt (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setInstalledSuccess(true);
      setTimeout(() => setInstalledSuccess(false), 5000);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIosOrIpad) {
      setShowIosInstructions(true);
    } else {
      // Browser doesn't support automatic prompt or was already dismissed
      setShowIosInstructions(true);
    }
  };

  // If already installed and running standalone, don't show prompt
  if (isStandalone && !installedSuccess) {
    return null;
  }

  if (variant === "header") {
    return (
      <>
        <button
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1E1E1E] text-white hover:bg-black transition-all shadow-xs border border-white/10"
          title="Install Becca's Crown App on tablet or desktop"
        >
          {installedSuccess ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Installed</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span className="hidden sm:inline">Install App</span>
            </>
          )}
        </button>

        <IosInstallDialog
          open={showIosInstructions}
          onClose={() => setShowIosInstructions(false)}
        />
      </>
    );
  }

  // Sidebar button
  return (
    <>
      <button
        onClick={handleInstallClick}
        className={cn(
          "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all text-white bg-zinc-900/90 hover:bg-zinc-800 border border-white/10 shadow-xs cursor-pointer",
          className
        )}
      >
        <Download className="w-4 h-4 shrink-0 text-amber-400" />
        <span className="flex-1 text-left">Install Studio App</span>
        <span className="text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-zinc-300">
          PWA
        </span>
      </button>

      <IosInstallDialog
        open={showIosInstructions}
        onClose={() => setShowIosInstructions(false)}
      />
    </>
  );
}

function IosInstallDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog isOpen={open} onClose={onClose} title="Install Becca's Crown Portal">
      <div className="space-y-4 py-2">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#ECEEEF]">
          <div className="w-10 h-10 rounded-lg bg-[#09090b] flex items-center justify-center shrink-0 border border-[#D4AF37]/30">
            <span className="text-sm font-black text-[#D4AF37]">BC</span>
          </div>
          <div>
            <div className="text-sm font-bold text-[#111827]">Becca&apos;s Crown Beauty Vault</div>
            <div className="text-xs text-[#6B7280]">Install on your iPad, Tablet, or Computer</div>
          </div>
        </div>

        <div className="space-y-3 text-xs text-[#374151]">
          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.02]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[10px] shrink-0 mt-0.5">
              1
            </span>
            <div className="leading-relaxed">
              <strong>On iPad / iPhone:</strong> Tap the <Share2 className="w-3.5 h-3.5 inline mx-1 text-blue-600" />{" "}
              <strong>Share</strong> icon in the Safari navigation bar.
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.02]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[10px] shrink-0 mt-0.5">
              2
            </span>
            <div className="leading-relaxed">
              Scroll down the menu and choose{" "}
              <strong className="inline-flex items-center gap-1 font-semibold text-[#111827]">
                <PlusSquare className="w-3.5 h-3.5 text-[#1E1E1E]" /> Add to Home Screen
              </strong>
              .
            </div>
          </div>

          <div className="flex items-start gap-3 p-2.5 rounded-lg bg-black/[0.02]">
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#1E1E1E] text-white font-bold text-[10px] shrink-0 mt-0.5">
              3
            </span>
            <div className="leading-relaxed">
              Tap <strong>Add</strong> in the top right corner. The app will launch in fullscreen with offline support for appointments and POS orders!
            </div>
          </div>

          <div className="pt-2 text-[11px] text-[#6B7280] border-t border-[#ECEEEF]">
            <strong>On Computer (Chrome / Edge):</strong> Look for the install icon <Laptop className="w-3 h-3 inline mx-1" /> in the address bar, or click your browser menu &rarr; <em>Install Becca&apos;s Crown...</em>
          </div>
        </div>

        <div className="pt-3 flex justify-end">
          <Button variant="blackPill" size="sm" onClick={onClose}>
            Got It
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

