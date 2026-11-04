'use client';

import { usePathname } from 'next/navigation';
import { useLayoutEffect, useRef, useState } from 'react';

const CELL = 56;
const DURATION = 420;

// Module state survives client navigation, so the first page load never plays a curtain.
let hasNavigated = false;

/** A pink wall of blocks that clears to reveal a new area of the app. */
export function PageCurtain() {
  const pathname = usePathname();
  const ref = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const isFirstLoad = !hasNavigated;
    hasNavigated = true;

    const canvas = ref.current;
    const skip =
      isFirstLoad ||
      pathname.startsWith('/super-admin') ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = canvas?.getContext('2d');

    if (skip || !canvas || !ctx) {
      setDone(true);
      return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = '#ff7a9a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cols = Math.ceil(canvas.width / CELL);
    const rows = Math.ceil(canvas.height / CELL);
    const cells = Array.from({ length: cols * rows }, (_, i) => i);
    for (let i = cells.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }

    let cleared = 0;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const target = Math.min(cells.length, Math.floor(((now - start) / DURATION) * cells.length));
      for (; cleared < target; cleared += 1) {
        const c = cells[cleared];
        ctx.clearRect((c % cols) * CELL, Math.floor(c / cols) * CELL, CELL, CELL);
      }
      if (cleared < cells.length) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
    // Runs once per mount: the template remounts this on each top-level navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (done) return null;

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[100] h-full w-full"
    />
  );
}
