'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart, X as XIcon } from '@/components/px-icons';
import { Stacky } from '@/components/pixel/sprites';
import { Button } from '@/components/ui/button';
import { PixelDissolve } from '@/components/pixel/pixel-dissolve';
import { useSwipeDrag } from '@/hooks/use-swipe-drag';
import { cn } from '@/lib/utils';

// Sample roles for the demo only. They are not real members.
const SAMPLES = [
  { role: 'Backend engineer', goal: 'Mentoring juniors', stack: ['Go', 'Postgres', 'Redis'], tone: 'bg-[color:var(--c-violet)] text-white' },
  { role: 'Frontend developer', goal: 'Hackathon teammate', stack: ['React', 'TypeScript', 'CSS'], tone: 'bg-[color:var(--c-butter)] text-[color:var(--c-ink)]' },
  { role: 'Startup founder', goal: 'Hiring a first engineer', stack: ['SaaS', 'Next.js', 'Stripe'], tone: 'bg-[color:var(--c-peach)] text-[color:var(--c-ink)]' },
  { role: 'CS student', goal: 'Looking for a mentor', stack: ['Python', 'SQL', 'Git'], tone: 'bg-[color:var(--c-tomato)] text-[color:var(--c-ink)]' },
];

export function DemoDeck() {
  const [index, setIndex] = useState(0);
  const [exit, setExit] = useState<'left' | 'right' | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const swipe = useCallback(
    (direction: 'left' | 'right') => {
      if (exit) return;
      setExit(direction);
      timer.current = setTimeout(() => {
        setIndex((i) => i + 1);
        setExit(null);
      }, 350);
    },
    [exit]
  );

  const { ref, handlers } = useSwipeDrag({ onSwipe: swipe, disabled: !!exit });
  const finished = index >= SAMPLES.length;
  const card = SAMPLES[index];
  const next = SAMPLES[index + 1];

  return (
    <div className="mx-auto w-full max-w-[20rem]">
      <div className="relative mt-16 h-[21rem]">
        <Stacky className="absolute -top-[4.6rem] left-3 z-20 w-20" />
        {finished ? (
          <div className="animate-card-in px-raised absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card p-6 text-center text-card-foreground">
            <p className="font-headline text-4xl font-semibold">That was the demo</p>
            <p className="text-sm text-muted-foreground">The real deck has real people in it.</p>
            <Button asChild>
              <Link href="/signup">Make your profile</Link>
            </Button>
            <button
              type="button"
              onClick={() => setIndex(0)}
              className="text-sm underline underline-offset-4 hover:text-primary-foreground"
            >
              Run it again
            </button>
          </div>
        ) : (
          <>
            {next && (
              <div
                aria-hidden="true"
                className={cn('px-box absolute inset-0 translate-x-2 translate-y-2 rotate-2', next.tone)}
              />
            )}
            <div
              key={card.role}
              ref={ref}
              {...handlers}
              className={cn(
                'px-swipe-card px-raised absolute inset-0 flex cursor-grab flex-col justify-between overflow-hidden p-6 active:cursor-grabbing',
                card.tone,
                !exit && 'animate-card-in',
                exit === 'left' && 'animate-swipe-out-left',
                exit === 'right' && 'animate-swipe-out-right'
              )}
            >
              <PixelDissolve active={!!exit} />
              <div
                aria-hidden="true"
                className="px-stamp-like absolute right-4 top-4 z-20 rotate-[8deg] border-4 border-current bg-[color:var(--c-leaf)] px-2 py-1 font-label text-lg text-[color:var(--c-ink)]"
              >
                Connect
              </div>
              <div
                aria-hidden="true"
                className="px-stamp-nope absolute left-4 top-4 z-20 -rotate-[8deg] border-4 border-current bg-card px-2 py-1 font-label text-lg text-card-foreground"
              >
                Deferred
              </div>

              <p className="font-label text-xs">Sample card {index + 1} of {SAMPLES.length}</p>
              <div>
                <h2 className="font-headline text-5xl font-semibold leading-[0.9]">{card.role}</h2>
                <p className="mt-2 text-sm font-medium">{card.goal}</p>
              </div>
              <ul className="flex flex-wrap gap-2">
                {card.stack.map((item) => (
                  <li key={item} className="border-2 border-current px-2 py-1 font-headline text-lg font-medium leading-none">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center gap-6">
        <Button
          variant="outline"
          size="icon"
          className="h-14 w-14 text-card-foreground"
          disabled={finished || !!exit}
          onClick={() => swipe('left')}
        >
          <XIcon className="h-7 w-7" />
          <span className="sr-only">Defer this sample card</span>
        </Button>
        <p className="font-label text-xs text-[color:var(--c-ink)]">Drag me</p>
        <Button
          size="icon"
          className="h-14 w-14 bg-[color:var(--c-leaf)] text-[color:var(--c-ink)] hover:bg-accent"
          disabled={finished || !!exit}
          onClick={() => swipe('right')}
        >
          <Heart className="h-7 w-7" />
          <span className="sr-only">Connect with this sample card</span>
        </Button>
      </div>
    </div>
  );
}
