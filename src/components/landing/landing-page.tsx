'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight } from '@/components/px-icons';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { ThemeToggle } from '@/components/theme-toggle';
import { PixelEdge } from '@/components/pixel/pixel-edge';
import { Ribbon } from '@/components/pixel/ribbon';
import { Cloud, CoinRow, Flower, PixelHeart, PixelStar, Stacky } from '@/components/pixel/sprites';
import { DemoDeck } from './demo-deck';
import { COMMUNITY_PRINCIPLES } from '@/lib/guidance';
import { cn } from '@/lib/utils';

const TOTAL_COINS = 10;

const STEPS = [
  {
    title: 'Say where you are',
    body: 'What you can help with, what you are learning and what you would love guidance on. No impressive job title needed.',
    tone: 'bg-[color:var(--c-violet)] text-white',
    tilt: '-rotate-3',
  },
  {
    title: 'Find your people',
    body: 'Swipe through people you can learn from and people you can help. Right to connect, left to skip.',
    tone: 'bg-[color:var(--c-tomato)] text-[color:var(--c-ink)] lg:mt-10',
    tilt: 'rotate-2',
  },
  {
    title: 'Make the handshake',
    body: 'When you both swipe right, your chat opens. Messaging is free for everyone.',
    tone: 'bg-[color:var(--c-pink)] text-[color:var(--c-ink)]',
    tilt: '-rotate-1',
  },
  {
    title: 'Just say hello',
    body: 'Not sure what to say? Get a few ideas based on both your profiles, then make them your own.',
    tone: 'bg-[color:var(--c-butter)] text-[color:var(--c-ink)] lg:mt-10',
    tilt: 'rotate-3',
  },
];

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const coinBand = useRef<HTMLElement>(null);
  const [coinsUsed, setCoinsUsed] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let cancelled = false;
    let cleanup = () => {};

    (async () => {
      const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('lenis'),
      ]);
      if (cancelled || !root.current) return;

      gsap.registerPlugin(ScrollTrigger);

      const lenis = new Lenis({ anchors: { offset: -72 } });
      lenis.on('scroll', ScrollTrigger.update);
      const raf = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(raf);
      gsap.ticker.lagSmoothing(0);

      const ctx = gsap.context(() => {
        gsap.from('[data-hero-line]', { yPercent: 40, opacity: 0, duration: 0.4, ease: 'steps(5)', stagger: 0.08 });

        gsap.utils.toArray<HTMLElement>('[data-reveal]').forEach((el) => {
          gsap.from(el, {
            y: 32,
            opacity: 0,
            duration: 0.45,
            ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%', once: true },
          });
        });

        ScrollTrigger.create({
          trigger: coinBand.current,
          start: 'top 75%',
          end: 'bottom 35%',
          onUpdate: (self) => setCoinsUsed(Math.round(self.progress * TOTAL_COINS)),
        });
      }, root);

      cleanup = () => {
        ctx.revert();
        gsap.ticker.remove(raf);
        lenis.destroy();
      };
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  return (
    <div ref={root} className="flex min-h-screen flex-col overflow-x-clip">
      <header className="sticky top-0 z-30 border-b-4 bg-background">
        <div className="container mx-auto flex h-16 items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Icons.logo className="size-8" />
            <span className="font-headline text-xl font-semibold sm:text-2xl">StackSwipe</span>
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <nav aria-label="Account" className="flex items-center gap-1 sm:gap-3">
              <Button variant="ghost" asChild className="px-2 sm:px-4">
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild className="px-3 sm:px-4">
                <Link href="/signup">Sign Up</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden bg-[color:var(--c-pink)] text-[color:var(--c-ink)]">
          <Cloud className="px-drift absolute right-[8%] top-6 w-24 opacity-90 sm:w-36 lg:left-[38%] lg:right-auto" />
          <Cloud className="px-drift absolute right-[4%] top-1/2 hidden w-24 opacity-80 [animation-delay:-4s] lg:block" />
          <Flower className="absolute -bottom-2 left-[42%] hidden w-24 lg:block" />

          <div className="container relative mx-auto grid items-center gap-10 px-4 pb-20 pt-12 sm:px-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:px-8 lg:pb-28 lg:pt-16">
            <div>
              <p data-hero-line className="font-label text-sm sm:text-base">
                A community where people connect, learn, share and grow together
              </p>
              <h1 className="mt-3 font-headline text-[22vw] font-bold leading-[0.82] sm:text-[20vw] lg:text-[clamp(5rem,10vw,11rem)]">
                <span data-hero-line className="block whitespace-nowrap">Everyone</span>
                <span data-hero-line className="block whitespace-nowrap">starts</span>
                <span data-hero-line className="block whitespace-nowrap">somewhere</span>
              </h1>
              <p data-hero-line className="mt-6 max-w-lg text-base font-medium sm:text-lg">
                Find people who can guide you, share what you know, and discover a community where every question is welcome.
              </p>
              <div data-hero-line className="mt-8 flex flex-wrap items-center gap-5">
                <Button asChild size="lg" className="group h-14 bg-[color:var(--c-butter)] px-8 text-2xl text-[color:var(--c-ink)]">
                  <Link href="/auth">
                    Find Your People
                    <ArrowRight className="h-6 w-6 transition-transform duration-100 group-hover:translate-x-1" />
                  </Link>
                </Button>
                <a href="#how-it-works" className="font-headline text-2xl font-semibold underline decoration-4 underline-offset-4">
                  See how it works
                </a>
              </div>
            </div>

            <div className="relative">
                            <DemoDeck />
            </div>
          </div>
        </section>

        {/* RIBBONS */}
        <div className="relative z-10 -mt-5 -rotate-1 scale-[1.04]">
          <Ribbon text="No question is too basic. Everyone has something to teach. Everyone has something to learn." />
        </div>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="bg-grid scroll-mt-20 pb-24 pt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative" data-reveal>
              <h2 className="font-headline text-[clamp(4rem,13vw,10rem)] font-bold leading-[0.85]">
                Four moves
                <br />
                to a real chat
              </h2>
              <Flower className="absolute -top-6 right-0 w-20 sm:w-32" />
            </div>

            <ol className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
              {STEPS.map((step, i) => (
                <li key={step.title} data-reveal>
                  <article className={cn('px-raised px-tilt flex min-h-[17rem] flex-col justify-between p-6', step.tone, step.tilt)}>
                    <span className="font-label text-2xl">{i + 1}</span>
                    <div>
                      <h3 className="font-headline text-4xl font-semibold leading-none">{step.title}</h3>
                      <p className="mt-3 text-sm font-medium leading-relaxed">{step.body}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* COINS */}
        <section ref={coinBand} className="bg-[color:var(--c-ink)] py-20 text-[color:var(--c-cream)]">
          <div className="container mx-auto grid items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div data-reveal>
              <h2 className="font-headline text-[clamp(4rem,10vw,8.5rem)] font-bold leading-[0.85]">
                10 coins a day
              </h2>
              <p className="mt-5 max-w-md text-lg">
                Every swipe spends one, so nobody gets mass-liked and every right swipe means something.
              </p>
            </div>
            <div data-reveal className="flex flex-col gap-4">
              <CoinRow
                total={TOTAL_COINS}
                used={coinsUsed}
                className="[&>span]:h-5 [&>span]:w-5 min-[375px]:[&>span]:h-7 min-[375px]:[&>span]:w-7 sm:[&>span]:h-10 sm:[&>span]:w-10"
              />
              <p className="font-label text-sm">Back tomorrow when you run out</p>
            </div>
          </div>
        </section>

        {/* PRINCIPLES */}
        <section className="bg-[color:var(--c-butter)] py-20 text-[color:var(--c-ink)]">
          <div className="container mx-auto grid gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
            <div data-reveal>
              <h2 className="font-headline text-[clamp(4rem,10vw,8.5rem)] font-bold leading-[0.85]">
                How we look after each other
              </h2>
              <p className="mt-5 max-w-md text-lg font-medium">
                You don&apos;t need to be successful, experienced or influential to deserve a connection. Your experience could save someone else hours of figuring things out.
              </p>
            </div>
            <ol data-reveal className="grid content-start gap-3">
              {COMMUNITY_PRINCIPLES.map((principle, index) => (
                <li key={principle} className="px-box flex items-baseline gap-4 bg-card p-4 text-card-foreground">
                  <span className="font-label text-sm">{index + 1}</span>
                  <span className="font-medium">{principle}</span>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* STACKBOT */}
        <section className="bg-grid py-24">
          <div className="container mx-auto grid items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:px-8">
            <div data-reveal>
              <h2 className="font-headline text-[clamp(4rem,10vw,8.5rem)] font-bold leading-[0.85]">
                StackBot is your sidekick
              </h2>
              <p className="mt-5 max-w-md text-lg text-muted-foreground">
                Ask about code, careers or what to learn next. In chats, it suggests replies you can send or edit.
              </p>
            </div>

            <div data-reveal className="px-raised flex flex-col gap-4 bg-card p-5 sm:p-8" aria-label="Example StackBot conversation">
              <p className="self-end border-2 bg-primary px-4 py-3 text-sm text-primary-foreground">
                I know React. What should I learn to get onto a backend team?
              </p>
              <p className="max-w-[90%] border-2 bg-muted px-4 py-3 text-sm">
                Start with SQL and one server framework, then ship a small API with auth. Want a four week plan?
              </p>
              <p className="flex items-center gap-2 font-label text-xs">
                <PixelStar className="h-4 w-4" />
                Example conversation
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <PixelEdge className="relative z-10 -mb-px bg-[color:var(--c-pink)]" />
      <footer className="overflow-hidden bg-[color:var(--c-pink)] text-[color:var(--c-ink)]">
        <div className="container mx-auto px-4 pb-6 pt-8 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-6">
            <Button asChild size="lg" className="h-14 bg-[color:var(--c-butter)] px-8 text-2xl text-[color:var(--c-ink)]">
              <Link href="/signup">Join StackSwipe</Link>
            </Button>
            <PixelHeart className="h-10 w-10" />
            <p className="font-headline text-2xl font-semibold">Find your people. Share what you know. Grow together.</p>
          </div>

          <div className="relative mt-10">
            <Stacky walking className="px-stroll absolute -top-14 left-0 w-16" />
            <p aria-hidden="true" className="whitespace-nowrap font-headline text-[27vw] font-bold leading-[0.8] xl:text-[21rem]">
              StackSwipe
            </p>
          </div>

          <div className="mt-8 flex flex-col items-center justify-between gap-3 text-sm font-medium sm:flex-row">
            <p>&copy; {new Date().getFullYear()} StackSwipe. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="#" className="underline-offset-4 hover:underline">About</Link>
              <Link href="#" className="underline-offset-4 hover:underline">Contact</Link>
              <Link href="#" className="underline-offset-4 hover:underline">Terms</Link>
              <Link href="#" className="underline-offset-4 hover:underline">Privacy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
