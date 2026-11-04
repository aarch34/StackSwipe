'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HandLeft, HandRight, PixelStar } from '@/components/pixel/sprites';
import { MessageSquare, ArrowRight } from '@/components/px-icons';
import { UserProfile } from '@/lib/data';
import { AuthUser } from '@/hooks/use-auth';

interface MatchCelebrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: AuthUser | null;
  currentUserProfile?: UserProfile | null;
  matchedProfile: UserProfile | null;
}

export function MatchCelebrationDialog({
  open,
  onOpenChange,
  currentUser,
  currentUserProfile,
  matchedProfile,
}: MatchCelebrationDialogProps) {
  useEffect(() => {
    if (!open) return;

    // Square pixel confetti, timed to fire as the two hands meet
    const burst = (options: confetti.Options) =>
      confetti({
        colors: ['#ff7a9a', '#ffd83f', '#7a56bd', '#2fb84a', '#f2572b'],
        shapes: ['square'],
        flat: true,
        scalar: 1.3,
        disableForReducedMotion: true,
        ...options,
      });

    const timer1 = setTimeout(() => {
      burst({ particleCount: 50, spread: 70, origin: { y: 0.45 }, ticks: 220, gravity: 0.8 });
      burst({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0.1, y: 0.65 } });
    }, 560);

    const timer2 = setTimeout(() => {
      burst({ particleCount: 40, angle: 120, spread: 55, origin: { x: 0.9, y: 0.65 } });
    }, 740);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [open]);

  if (!matchedProfile) return null;

  const currentUserName = currentUserProfile?.name || currentUser?.displayName || 'You';
  const currentUserPhoto = currentUserProfile?.photoURL || currentUser?.photoURL || '';

  // Calculate common tech stack if available
  const userStack = new Set((currentUserProfile?.techStack || []).map((s) => s.toLowerCase()));
  const commonTech = (matchedProfile.techStack || []).filter((s) => userStack.has(s.toLowerCase()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md gap-0 overflow-hidden p-0">
        <div className="relative overflow-hidden bg-[color:var(--c-pink)] px-6 pb-6 pt-8 text-center text-[color:var(--c-ink)]">
          <div className="mb-3 inline-flex items-center gap-1.5 bg-[color:var(--c-ink)] px-3 py-1 font-label text-xs text-[color:var(--c-cream)]">
            200 OK: mutual handshake
          </div>

          <DialogTitle className="font-headline text-5xl font-bold leading-none sm:text-6xl">
            It&apos;s a Handshake!
          </DialogTitle>

          <DialogDescription className="mx-auto mt-2 max-w-xs text-sm font-medium text-[color:var(--c-ink)]">
            You and <span className="font-bold">{matchedProfile.name}</span> have connected threads. Your stacks align!
          </DialogDescription>

          {/* Two avatars, and two hands that walk in and shake */}
          <div className="relative mb-1 mt-6 flex items-center justify-center gap-1">
            <Avatar className="px-box h-20 w-20 shrink-0">
              <AvatarImage src={currentUserPhoto} alt={currentUserName} />
              <AvatarFallback className="bg-[color:var(--c-butter)] font-headline text-2xl font-bold text-[color:var(--c-ink)]">
                {currentUserName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="relative flex w-32 shrink-0 items-center justify-center" aria-hidden="true">
              <span className="animate-hand-left relative z-10 -mr-1 block w-16">
                <HandLeft className="w-full" />
              </span>
              <span className="animate-hand-right block w-16">
                <HandRight className="w-full" />
              </span>
              <PixelStar className="animate-burst absolute -top-5 left-1/2 z-20 h-8 w-8 -translate-x-1/2" />
            </div>

            <Avatar className="px-box h-20 w-20 shrink-0">
              <AvatarImage src={matchedProfile.photoURL} alt={matchedProfile.name} />
              <AvatarFallback className="bg-[color:var(--c-butter)] font-headline text-2xl font-bold text-[color:var(--c-ink)]">
                {matchedProfile.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Profile Details & Shared Skills */}
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-2.5 border-2 bg-card p-3.5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-headline text-2xl font-semibold leading-none text-foreground">{matchedProfile.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {matchedProfile.jobTitle || matchedProfile.headline || 'Software Developer'}
                  {matchedProfile.company ? ` at ${matchedProfile.company}` : ''}
                </p>
              </div>
              {matchedProfile.location && (
                <Badge variant="outline" className="text-[11px] font-normal text-muted-foreground">
                  {matchedProfile.location}
                </Badge>
              )}
            </div>

            {/* Mutual tech stack or tags */}
            {matchedProfile.techStack && matchedProfile.techStack.length > 0 && (
              <div className="pt-1">
                <p className="text-[11px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                  <span>Stack:</span>
                  {commonTech.length > 0 && (
                    <span className="font-semibold text-foreground">(Shared: {commonTech.join(', ')})</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedProfile.techStack.slice(0, 5).map((tech) => {
                    const isShared = commonTech.includes(tech);
                    return (
                      <span
                        key={tech}
                        className={`border-2 px-2 py-0.5 font-headline text-sm font-medium leading-none ${
                          isShared ? 'bg-accent text-accent-foreground' : 'bg-muted text-foreground'
                        }`}
                      >
                        {tech}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Quick Icebreaker suggestion */}
          <div className="flex items-center gap-2 border-2 bg-muted p-2.5 text-xs text-foreground">
            <span className="font-semibold">Icebreaker:</span>
            <span className="italic truncate">
              &ldquo;Hey {matchedProfile.name}, great to connect! What are you building right now?&rdquo;
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1 pb-2">
            <Button
              asChild
              size="lg"
              className="w-full"
            >
              <Link href={`/dashboard/messages?userId=${matchedProfile.id}`} onClick={() => onOpenChange(false)}>
                <MessageSquare className="mr-2 h-5 w-5" />
                Start Chatting Now
                <ArrowRight className="ml-1.5 h-5 w-5" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Keep Swiping & Discover More
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
