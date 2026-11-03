'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  ArrowRight,
  Briefcase,
  Code,
  Heart,
  MessageSquare,
  Sparkles,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle'; // adjust name/path if needed

export default function LandingPage() {
  const aboutRef = useRef<HTMLDivElement>(null);

  const scrollToAbout = () => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-background/60 to-background">
      {/* NAV */}
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <Icons.logo className="size-8 text-primary" />
            <span className="font-headline text-xl font-semibold tracking-tight">
              StackSwipe
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <nav className="hidden items-center gap-2 md:flex">
              <Button variant="ghost" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* BENTO GRID */}
        <section className="container mx-auto px-4 py-10 sm:px-6 lg:px-8 lg:py-16">
          <div className="grid auto-rows-[minmax(160px,auto)] gap-5 md:grid-cols-4">
            {/* HERO LEFT */}
            <div className="group relative flex flex-col justify-between rounded-3xl border border-border/70 bg-background/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-2xl md:col-span-2 md:row-span-2">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary">
                  <Sparkles className="h-3 w-3" />
                  AI‑powered networking for tech professionals
                </div>
                <h1 className="mt-4 font-headline text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Turn swipes into{' '}
                  <span className="bg-gradient-to-r from-primary via-sky-400 to-violet-400 bg-clip-text text-transparent">
                    real connections
                  </span>
                </h1>
                <p className="mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
                  StackSwipe helps developers, designers, founders, and students
                  find mentors, collaborators, and opportunities through an
                  intelligent, swipe‑based experience.
                </p>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" asChild className="group/btn">
                  <Link href="/auth">
                    Get started
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover/btn:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={scrollToAbout}
                  className="border-dashed"
                >
                  Learn more
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <Pill icon={<Users className="h-3 w-3" />}>Built for devs</Pill>
                <Pill icon={<MessageSquare className="h-3 w-3" />}>
                  AI ice‑breakers & replies
                </Pill>
                <Pill icon={<Briefcase className="h-3 w-3" />}>
                  Collaboration‑ready profiles
                </Pill>
              </div>
            </div>

            {/* HERO RIGHT – swipe animation */}
            <div className="relative flex items-center justify-center rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm md:col-span-2">
              <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.15),transparent_60%),_radial-gradient(circle_at_bottom,_rgba(129,140,248,0.15),transparent_55%)]" />
              <div className="w-full max-w-md overflow-hidden">
                <p className="mb-3 text-xs font-medium text-muted-foreground">
                  How swiping feels in StackSwipe
                </p>
                <div className="relative h-52">
                  {/* track */}
                  <div className="absolute inset-0 flex animate-swipe-cards gap-4">
                    <SwipeCard name="Backend engineer" tags={['Go', 'Postgres', 'Mentor']} />
                    <SwipeCard name="Frontend dev" tags={['React', 'TypeScript', 'Learner']} />
                    <SwipeCard name="Founder" tags={['SaaS', 'Hiring', 'Remote']} />
                  </div>
                </div>
                <p className="mt-3 text-[11px] text-muted-foreground">
                  Cards glide horizontally to mimic swiping. In the app, you&apos;ll swipe
                  left or right to skip, connect, or super‑connect.
                </p>
              </div>
            </div>

            {/* AI replies */}
            <div className="flex flex-col justify-between rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:col-span-2">
              <div>
                <p className="text-xs font-medium text-sky-400">AI assistance</p>
                <h2 className="mt-2 text-base font-semibold">
                  GROQ‑powered smart replies
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Reply suggestions and ice‑breakers generated from your
                  conversation history, personalized to both profiles.
                </p>
              </div>
              <div className="mt-3 space-y-1 rounded-xl bg-slate-950/80 p-3 text-[11px]">
                <p className="text-slate-200">
                  “Your work with Next.js and Supabase sounds awesome—how did
                  you handle real‑time updates in your architecture?”
                </p>
                <p className="text-[10px] text-slate-400">
                  Suggested by AI · Tap to send or edit
                </p>
              </div>
            </div>

            {/* Profiles */}
            <div className="flex flex-col rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-xs font-medium text-violet-400">Profiles</p>
              <h2 className="mt-2 text-base font-semibold">
                Designed for developers
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Show your stack, links, and what you&apos;re currently building.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <Tag>TypeScript</Tag>
                <Tag>Next.js</Tag>
                <Tag>Open source</Tag>
              </div>
            </div>

            {/* Mentorship */}
            <div className="flex flex-col rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <p className="text-xs font-medium text-emerald-400">Mentorship</p>
              <h2 className="mt-2 text-base font-semibold">
                Mentors, learners, and hiring signals
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Networking tags make it obvious whether someone wants mentorship,
                collaboration, or talent.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <Tag>Mentor</Tag>
                <Tag>Learner</Tag>
                <Tag>Hiring</Tag>
              </div>
            </div>

            {/* Collaboration */}
            <div className="flex flex-col justify-between rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:col-span-2">
              <div>
                <p className="text-xs font-medium text-rose-400">Collaboration</p>
                <h2 className="mt-2 text-base font-semibold">
                  Find people to ship with
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Filter for side‑project builders, indie hackers, or startup
                  founders and turn chats into shipped products.
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>“Looking for a frontend dev for a SaaS MVP.”</span>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                  12 matches nearby
                </span>
              </div>
            </div>

            {/* Tech stack / About */}
            <div
              ref={aboutRef}
              className="flex flex-col rounded-3xl border border-border/70 bg-background/80 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-xl md:col-span-2"
            >
              <p className="text-xs font-medium text-blue-400">Under the hood</p>
              <h2 className="mt-2 text-base font-semibold">
                Modern stack, privacy‑first
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Built with Next.js, Supabase Auth & Database, GROQ LLMs and
                Gemini—optimized for real‑time, secure professional networking.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                <Tag>Next.js 15</Tag>
                <Tag>Tailwind CSS</Tag>
                <Tag>Supabase</Tag>
                <Tag>Supabase Auth</Tag>
                <Tag>GROQ · Gemini</Tag>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <p>&copy; {new Date().getFullYear()} StackSwipe. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-foreground">
              About
            </Link>
            <Link href="#" className="hover:text-foreground">
              Contact
            </Link>
            <Link href="#" className="hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* helpers */

function Pill({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background/70 px-3 py-1 ring-1 ring-border/70">
      {icon}
      <span>{children}</span>
    </span>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-slate-900/80 px-2.5 py-1 text-[10px] font-medium text-slate-100 ring-1 ring-slate-700/70 dark:bg-slate-900/80">
      {children}
    </span>
  );
}

function SwipeCard({
  name,
  tags,
}: {
  name: string;
  tags: string[];
}) {
  return (
    <div className="relative flex w-56 flex-shrink-0 flex-col justify-between rounded-2xl border border-border/70 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 shadow-lg">
      <div>
        <p className="text-xs font-medium text-slate-400">Suggested match</p>
        <p className="mt-1 text-sm font-semibold text-slate-50">{name}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5 text-[10px]">
        {tags.map((t) => (
          <span
            key={t}
            className="rounded-full bg-slate-900/80 px-2 py-1 text-slate-100"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-[11px] text-slate-400">
        <span>Swipe left · Skip</span>
        <span>Swipe right · Connect</span>
      </div>
    </div>
  );
}
