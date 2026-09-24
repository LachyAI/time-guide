"use client";

import { useEffect, useRef } from "react";

/**
 * Heartbeat cursor — three rings pulsing outward from the pointer.
 * Desktop only (hidden on touch via CSS). rAF-driven position with a
 * slight trailing ease; pure CSS ring animation.
 */
export function CursorPulse() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let tx = -100, ty = -100; // target
    let cx = -100, cy = -100; // current (eased)
    let raf: number;

    const onMove = (e: MouseEvent) => {
      tx = e.clientX;
      ty = e.clientY;
    };

    const tick = () => {
      cx += (tx - cx) * 0.22;
      cy += (ty - cy) * 0.22;
      el.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="cursor-pulse" ref={ref} aria-hidden="true">
      <span className="cursor-ring cursor-ring-1" />
      <span className="cursor-ring cursor-ring-2" />
      <span className="cursor-ring cursor-ring-3" />
      <span className="cursor-core" />
    </div>
  );
}
