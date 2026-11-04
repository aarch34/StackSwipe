import { cn } from '@/lib/utils';

/**
 * Stepped "torn paper" divider. The shape is a CSS mask, so its colour comes from
 * the background class and follows the theme.
 */
export function PixelEdge({
  className,
  flip = false,
}: {
  /** Must include a background colour class, e.g. `bg-primary`. */
  className?: string;
  flip?: boolean;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn('px-edge pointer-events-none h-10 w-full', flip && '-scale-y-100', className)}
    />
  );
}
