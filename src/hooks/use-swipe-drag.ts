'use client';

import { useCallback, useEffect, useRef, type DragEvent, type MouseEvent, type PointerEvent } from 'react';

type Direction = 'left' | 'right';

const AXIS_LOCK_PX = 8;

/**
 * Drag-to-swipe for a card. Horizontal drags move the card; vertical ones are left alone so
 * the content inside can still scroll. Writes straight to the element so dragging never re-renders.
 *
 * Exposes `--like` and `--nope` (0 to 1) for the stamps, and `--drag-x` so the exit animation
 * can continue from wherever the card was let go.
 */
export function useSwipeDrag({
  onSwipe,
  disabled = false,
  threshold = 100,
}: {
  onSwipe: (direction: Direction) => void;
  disabled?: boolean;
  threshold?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const state = useRef({ id: -1, startX: 0, startY: 0, axis: '' as '' | 'x' | 'y', x: 0, moved: false });

  const apply = useCallback(
    (x: number, animate: boolean) => {
      const el = ref.current;
      if (!el) return;
      el.style.transition = animate ? 'transform 220ms cubic-bezier(.2,.9,.3,1)' : 'none';
      el.style.transform = x ? `translateX(${x}px) rotate(${x * 0.04}deg)` : '';
      el.style.setProperty('--drag-x', `${x}px`);
      el.style.setProperty('--like', String(Math.min(Math.max(x / threshold, 0), 1)));
      el.style.setProperty('--nope', String(Math.min(Math.max(-x / threshold, 0), 1)));
    },
    [threshold]
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (disabled || e.button !== 0) return;
      if ((e.target as HTMLElement).closest('a, button, input, textarea, select, [role="dialog"]')) return;
      state.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, axis: '', x: 0, moved: false };
    },
    [disabled]
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const s = state.current;
      if (s.id !== e.pointerId) return;
      const dx = e.clientX - s.startX;
      const dy = e.clientY - s.startY;

      if (!s.axis) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
        s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
        if (s.axis === 'y') {
          s.id = -1;
          return;
        }
        s.moved = true;
        ref.current?.setPointerCapture(e.pointerId);
      }

      s.x = dx;
      apply(dx, false);
    },
    [apply]
  );

  const finish = useCallback(
    (e: PointerEvent<HTMLDivElement>, commit: boolean) => {
      const s = state.current;
      if (s.id !== e.pointerId) return;
      s.id = -1;
      if (s.axis !== 'x') return;

      if (commit && !disabled && Math.abs(s.x) >= threshold) {
        // Hand over to the exit animation, which starts from --drag-x.
        const el = ref.current;
        if (el) {
          el.style.transition = 'none';
          el.style.transform = '';
        }
        onSwipe(s.x > 0 ? 'right' : 'left');
      } else {
        apply(0, true);
      }
    },
    [apply, disabled, onSwipe, threshold]
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => finish(e, true), [finish]);
  const onPointerCancel = useCallback((e: PointerEvent<HTMLDivElement>) => finish(e, false), [finish]);

  // A drag that ends over a link or button should not also click it.
  const onClickCapture = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (state.current.moved) {
      state.current.moved = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, []);

  const onDragStart = useCallback((e: DragEvent<HTMLDivElement>) => e.preventDefault(), []);

  useEffect(() => {
    if (disabled) state.current.id = -1;
  }, [disabled]);

  return {
    ref,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClickCapture, onDragStart },
  };
}
