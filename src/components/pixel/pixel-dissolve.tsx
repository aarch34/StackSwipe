'use client';

import { useEffect, useRef } from 'react';

const CELL = 24;

/**
 * Eats its parent away in random squares of the page colour while `active`.
 * Purely visual: the swipe logic owns all the timing, and this just fills `duration`.
 */
export function PixelDissolve({
  active,
  duration = 300,
}: {
  active: boolean;
  duration?: number;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!active || !canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = Math.ceil(width);
    canvas.height = Math.ceil(height);
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor;

    const cols = Math.ceil(canvas.width / CELL);
    const rows = Math.ceil(canvas.height / CELL);
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let drawn = 0;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const target = Math.min(cells.length, Math.floor(((now - start) / duration) * cells.length));
      for (; drawn < target; drawn += 1) {
        const c = cells[drawn];
        ctx.fillRect((c % cols) * CELL, Math.floor(c / cols) * CELL, CELL, CELL);
      }
      if (drawn < cells.length) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [active, duration]);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-30 h-full w-full"
    />
  );
}
