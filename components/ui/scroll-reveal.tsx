"use client";

import * as React from "react";

/**
 * High-precision luxury scroll progress bar that tracks scroll progress
 * across the viewport with a glowing gold/amber gradient.
 */
export function ScrollProgressBar() {
  const [scrollProgress, setScrollProgress] = React.useState(0);

  React.useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll <= 0) return;
      const currentProgress = (window.scrollY / totalScroll) * 100;
      setScrollProgress(Math.min(100, Math.max(0, currentProgress)));
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.85)] transition-all duration-75 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />
    </div>
  );
}

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  variant?: "fade-up" | "fade-down" | "fade-left" | "fade-right" | "zoom-in";
  delayMs?: number;
  durationMs?: number;
  threshold?: number;
}

/**
 * ScrollReveal: Animates elements into view when scrolled into the viewport
 * with a visible, luxury spring/cubic-bezier curve.
 */
export function ScrollReveal({
  children,
  className = "",
  variant = "fade-up",
  delayMs = 0,
  durationMs = 700,
  threshold = 0.15,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold,
        rootMargin: "0px 0px -40px 0px",
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [threshold]);

  // Variant transformations when hidden
  const getHiddenTransform = () => {
    switch (variant) {
      case "fade-down":
        return "translate-y-[-32px] opacity-0";
      case "fade-left":
        return "translate-x-[-40px] opacity-0";
      case "fade-right":
        return "translate-x-[40px] opacity-0";
      case "zoom-in":
        return "scale-90 opacity-0";
      case "fade-up":
      default:
        return "translate-y-12 scale-[0.97] opacity-0";
    }
  };

  return (
    <div
      ref={ref}
      style={{
        transitionDuration: `${durationMs}ms`,
        transitionDelay: `${delayMs}ms`,
        transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
      }}
      className={`transition-all will-change-[transform,opacity] ${
        isVisible
          ? "translate-y-0 translate-x-0 scale-100 opacity-100"
          : getHiddenTransform()
      } ${className}`}
    >
      {children}
    </div>
  );
}
