
'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { ArrowRight, Briefcase, Code, Heart, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

export default function LandingPage() {
  const aboutRef = useRef<HTMLDivElement>(null);

  const handleLearnMoreClick = () => {
    aboutRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <header className="container mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <Icons.logo className="size-8 text-primary" />
          <span className="font-headline text-xl font-semibold">
            StackSwipe
          </span>
        </Link>
        <nav className="hidden md:flex gap-4">
           <Button variant="ghost" asChild>
              <Link href="/login">Login</Link>
           </Button>
           <Button asChild>
              <Link href="/signup">Sign Up</Link>
           </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="container mx-auto px-4 sm:px-6 lg:px-8 text-center py-20 md:py-32 flex flex-col items-center">
            <h1 className="font-headline text-4xl md:text-6xl font-bold tracking-tight">
                STACKSWIPE
            </h1>
            <p className="mt-4 text-lg md:text-xl text-muted-foreground">
                An AI-powered social networking application for tech professionals.
            </p>
            <p className="mt-8 max-w-2xl text-base text-muted-foreground">
                Connect with peers, find mentors, and collaborate on exciting projects. StackSwipe helps you build your professional network in the tech industry through intuitive, swipe-based matching.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                    <Link href="/signup">
                        Get Started <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                </Button>
                <Button size="lg" variant="outline" onClick={handleLearnMoreClick}>
                    Learn More
                </Button>
            </div>
        </section>

        <section id="about" ref={aboutRef} className="bg-secondary py-20 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center">
                <h2 className="font-headline text-3xl md:text-4xl font-bold">What is StackSwipe?</h2>
                <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
                    A professional networking app designed to help you make meaningful connections in the tech world.
                </p>
            </div>
            <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
                <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground">
                        <Heart className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-semibold">Swipe-Based Matching</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Easily connect with tech professionals through a simple, intuitive swipe interface.</p>
                </div>
                 <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground">
                        <UserPlus className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-semibold">Detailed Profiles</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Showcase your skills, interests, and link your GitHub and LinkedIn profiles.</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground">
                        <Code className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-semibold">Mentorship Tags</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Tag yourself as a 'Mentor' or 'Learner' to find the right connections for your career growth.</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary text-primary-foreground">
                        <Briefcase className="h-6 w-6" />
                    </div>
                    <h3 className="mt-4 font-semibold">Collaboration Requests</h3>
                    <p className="mt-2 text-sm text-muted-foreground">Looking for a project partner? Find collaborators and build something amazing together.</p>
                </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center border-t pt-6">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} StackSwipe. All rights reserved.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">About</Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Contact</Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
            </div>
        </div>
      </footer>
    </div>
  );
}
