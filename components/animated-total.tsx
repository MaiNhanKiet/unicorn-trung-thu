"use client";

import { useEffect, useRef, useState } from "react";
import { formatVnd } from "@/lib/format";

export function AnimatedTotal({
  value,
  ready,
}: {
  value: number;
  ready: boolean;
}) {
  const [display, setDisplay] = useState(0);
  const [bump, setBump] = useState(false);
  const previous = useRef(0);
  const booted = useRef(false);
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;

    if (!booted.current) {
      booted.current = true;
      previous.current = value;
      setDisplay(value);
      return;
    }

    const from = previous.current;
    const to = value;
    if (from === to) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      previous.current = to;
      setDisplay(to);
      setBump(true);
      const timer = window.setTimeout(() => setBump(false), 400);
      return () => window.clearTimeout(timer);
    }

    setBump(true);
    const duration = 900;
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        previous.current = to;
        setDisplay(to);
        window.setTimeout(() => setBump(false), 350);
      }
    };

    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(tick);

    return () => {
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [value, ready]);

  return (
    <p
      className={`mt-2 text-3xl font-semibold tabular-nums text-[var(--color-gold)] transition-[transform,filter] duration-300 sm:text-4xl lg:text-5xl ${
        bump
          ? "scale-110 drop-shadow-[0_0_16px_rgba(212,120,154,0.35)]"
          : "scale-100"
      }`}
    >
      {ready ? formatVnd(display) : "…"}
    </p>
  );
}
