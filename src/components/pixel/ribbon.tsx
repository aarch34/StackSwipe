import { cn } from '@/lib/utils';

/** Yellow band of scrolling text. The real sentence is read once; the copies are hidden from assistive tech. */
export function Ribbon({
  text,
  reverse = false,
  className,
}: {
  text: string;
  reverse?: boolean;
  className?: string;
}) {
  const copies = Array.from({ length: 6 });

  return (
    <div
      className={cn(
        'overflow-hidden border-y-4 border-[color:var(--c-ink)] bg-[color:var(--c-butter)] py-2 text-[color:var(--c-ink)]',
        className
      )}
    >
      <span className="sr-only">{text}</span>
      <div aria-hidden="true" className={cn('px-marquee flex w-max', reverse && 'px-marquee-reverse')}>
        {[0, 1].map((group) => (
          <div key={group} className="flex shrink-0">
            {copies.map((_, i) => (
              <span key={i} className="whitespace-nowrap px-4 font-label text-sm sm:text-base">
                {text}
                <span className="pl-8">+</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
