"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function LandingHoneycombBackground() {
  const containerRef = useRef(null);
  const honeycombRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !honeycombRef.current) return;

    // Opacity driven strictly by scroll activity (wheel/touch/scroll), never by ScrollTrigger progress.
    // Keep fade-in timing as-is; make fade-out snappy via dedicated tween when idle.
    const setOpacity = gsap.quickTo(honeycombRef.current, "opacity", {
      duration: 0.2,
      ease: "power1.out",
    });

    let hideDelay: gsap.core.Tween | null = null;
    let fadeOutTween: gsap.core.Tween | null = null;
    let wiggleTween: gsap.core.Tween | gsap.core.Timeline | null = null;
    let lastScrollY = typeof window !== "undefined" ? window.scrollY : 0;
    let activeZone = true; // for whole page, always active

    const handleActivity = () => {
      if (!activeZone) return;
      if (fadeOutTween) fadeOutTween.kill();
      if (wiggleTween) wiggleTween.kill();

      const currentY = typeof window !== "undefined" ? window.scrollY : lastScrollY;
      const delta = currentY - lastScrollY;
      lastScrollY = currentY;
      const wiggle = Math.max(-1, Math.min(1, delta / 200)) * 24; // clamp and scale

      // Bring up to view then add a small jelly wiggle tied to scroll delta
      wiggleTween = gsap.timeline({ overwrite: true })
        .to(honeycombRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.22,
          ease: "power2.out",
        })
        .to(honeycombRef.current, {
          y: wiggle,
          duration: 0.08,
          ease: "power1.out",
        })
        .to(honeycombRef.current, {
          y: 0,
          duration: 0.18,
          ease: "elastic.out(1, 0.7)",
        });

      if (hideDelay) hideDelay.kill();
      hideDelay = gsap.delayedCall(0.04, () => {
        // Animate honeycombs sinking down while fading out
        fadeOutTween = gsap.to(honeycombRef.current, {
          opacity: 0,
          y: "+=80",
          duration: 0.3,
          ease: "power2.in",
        });
      });
    };

    const listeners: Array<[string, EventListener]> = [
      ["wheel", handleActivity],
      ["touchmove", handleActivity],
      ["scroll", handleActivity],
    ];

    listeners.forEach(([type, fn]) => window.addEventListener(type, fn, { passive: true }));

    // ScrollTrigger only scrubs Y position across the whole page; opacity is activity-driven.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: containerRef.current,
        start: "top top",
        end: "max",
        scrub: 1,
        onEnter: () => {
          activeZone = true;
          setOpacity(0);
        },
        onEnterBack: () => {
          activeZone = true;
          setOpacity(0);
        },
      },
    });

    // Animate honeycomb pattern from bottom; position tied to scroll, opacity not.
    tl.fromTo(
      honeycombRef.current,
      { y: 80 },
      { y: 0, duration: 1, ease: "power2.out" }
    );

    return () => {
      listeners.forEach(([type, fn]) => window.removeEventListener(type, fn));
      if (hideDelay) hideDelay.kill();
      if (fadeOutTween) fadeOutTween.kill();
      if (wiggleTween) wiggleTween.kill();
      tl.scrollTrigger?.kill();
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: 0,
        background: "linear-gradient(135deg, #0f0e17 0%, #1a1929 100%)",
      }}
    >
      {/* Honeycomb pattern container */}
      <div
        ref={honeycombRef}
        className="absolute inset-x-0 bottom-0 overflow-hidden"
        style={{
          opacity: 0,
          transform: "translateY(80px)", // Start from below
          height: "25vh",
        }}
      >
        <svg
          className="w-full h-full"
          style={{ position: "absolute", inset: 0 }}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Honeycomb pattern with gradient mask */}
            <pattern
              id="honeycomb"
              x="0"
              y="0"
              width="40"
              height="34"
              patternUnits="userSpaceOnUse"
              patternTransform="scale(0.65)"
            >
              {/* Smaller, connected hexagons (two staggered rows per tile) */}
              <g stroke="rgba(255, 215, 0, 0.4)" strokeWidth="1.1" fill="none">
                {/* Row 1 hex */}
                <polygon points="22,17 17,26 7,26 2,17 7,8 17,8" />
                {/* Row 2 offset hex */}
                <polygon points="40,26 35,34 25,34 20,26 25,18 35,18" />
              </g>
            </pattern>

            {/* Gradient mask: opaque at bottom, transparent at top */}
            <linearGradient
              id="honeycombMask"
              x1="0%"
              y1="100%"
              x2="0%"
              y2="0%"
            >
              <stop offset="0%" stopColor="white" stopOpacity="0.8" />
              <stop offset="40%" stopColor="white" stopOpacity="0.3" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>

            <mask id="fadeHoneycomb">
              <rect width="100%" height="100%" fill="url(#honeycombMask)" />
            </mask>
          </defs>

          {/* Apply honeycomb pattern with gradient fade mask */}
          <rect
            width="100%"
            height="100%"
            fill="url(#honeycomb)"
            mask="url(#fadeHoneycomb)"
          />
        </svg>
      </div>
    </div>
  );
}
