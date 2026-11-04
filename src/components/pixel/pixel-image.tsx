'use client';

import Image, { type ImageProps } from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

const STAGES = [10, 20, 40];
const STAGE_MS = 80;

/**
 * A photo that arrives as a chunky mosaic and sharpens in steps. The canvas is only
 * ever drawn to and never read back, so remote images need no CORS headers.
 * Without motion, or if drawing fails, it behaves like a plain image.
 */
export function PixelImage({ className, onLoad, alt, ...props }: ImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [mosaic, setMosaic] = useState(true);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const handleLoad: NonNullable<ImageProps['onLoad']> = useCallback(
    (event) => {
      onLoad?.(event);

      const img = event.currentTarget;
      const canvas = canvasRef.current;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!canvas || reduced || !img.naturalWidth) {
        setMosaic(false);
        return;
      }

      const box = img.getBoundingClientRect();
      const ratio = box.height / box.width || 1;
      const draw = (cols: number) => {
        const ctx = canvas.getContext('2d');
        if (!ctx) return false;
        canvas.width = cols;
        canvas.height = Math.max(1, Math.round(cols * ratio));
        // Same crop as object-cover with object-top.
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const sw = canvas.width / scale;
        const sh = canvas.height / scale;
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, (img.naturalWidth - sw) / 2, 0, sw, sh, 0, 0, canvas.width, canvas.height);
        return true;
      };

      try {
        if (!draw(STAGES[0])) throw new Error('no canvas context');
        STAGES.slice(1).forEach((cols, i) => {
          timers.current.push(setTimeout(() => draw(cols), STAGE_MS * (i + 1)));
        });
        timers.current.push(setTimeout(() => setMosaic(false), STAGE_MS * STAGES.length));
      } catch {
        setMosaic(false);
      }
    },
    [onLoad]
  );

  return (
    <>
      <Image alt={alt} className={className} onLoad={handleLoad} {...props} />
      {mosaic && (
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className={cn('pointer-events-none absolute inset-0 h-full w-full bg-muted')}
          style={{ imageRendering: 'pixelated' }}
        />
      )}
    </>
  );
}
