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
import { Sparkles, MessageSquare, Handshake, Code2, ArrowRight, Share2 } from '@/components/px-icons';
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

    // Trigger celebratory particle explosion (sparkles & confetti cannons)
    // 1. Center sparkle burst
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#10b981', '#34d399', '#6ee7b7', '#38bdf8', '#818cf8', '#f59e0b'],
      ticks: 250,
      gravity: 0.8,
      scalar: 1.1,
    });

    // 2. Left cannon after 180ms
    const timer1 = setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0.1, y: 0.65 },
        colors: ['#10b981', '#06b6d4', '#ec4899', '#f59e0b'],
      });
    }, 180);

    // 3. Right cannon after 360ms
    const timer2 = setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 0.9, y: 0.65 },
        colors: ['#10b981', '#8b5cf6', '#3b82f6', '#f43f5e'],
      });
    }, 360);

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
      <DialogContent className="max-w-md w-full border-emerald-500/30 bg-background/95 backdrop-blur-xl p-0 overflow-hidden shadow-2xl shadow-emerald-500/10 sm:rounded-2xl">
        {/* Glowing atmospheric header background */}
        <div className="relative overflow-hidden px-6 pt-8 pb-6 text-center bg-gradient-to-b from-emerald-500/15 via-teal-500/5 to-transparent">
          {/* Subtle animated sparkles badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 mb-3 shadow-sm animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>200 OK · Mutual Handshake Formed</span>
          </div>

          <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight font-headline bg-gradient-to-r from-emerald-400 via-teal-300 to-sky-400 bg-clip-text text-transparent">
            It&apos;s a Handshake! 🤝
          </DialogTitle>

          <DialogDescription className="mt-2 text-sm text-muted-foreground max-w-xs mx-auto">
            You and <span className="font-semibold text-foreground">{matchedProfile.name}</span> have connected threads. Your stacks align!
          </DialogDescription>

          {/* DUAL AVATARS WITH CONNECTING CIRCUIT BEAM */}
          <div className="mt-6 mb-2 flex items-center justify-center gap-4 relative">
            {/* User Avatar */}
            <div className="relative group">
              <Avatar className="w-18 h-18 sm:w-20 sm:h-20 border-3 border-emerald-500 shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-500/20">
                <AvatarImage src={currentUserPhoto} alt={currentUserName} />
                <AvatarFallback className="bg-emerald-950 text-emerald-300 font-bold text-lg">
                  {currentUserName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-black rounded-full p-1 shadow">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>

            {/* Connecting Handshake Badge */}
            <div className="relative flex flex-col items-center">
              <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-lg shadow-emerald-500/40 animate-bounce">
                <Handshake className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-mono tracking-wider text-emerald-400 uppercase mt-1 font-semibold">
                LINKED
              </span>
            </div>

            {/* Matched Avatar */}
            <div className="relative group">
              <Avatar className="w-18 h-18 sm:w-20 sm:h-20 border-3 border-teal-500 shadow-lg shadow-teal-500/25 ring-4 ring-teal-500/20">
                <AvatarImage src={matchedProfile.photoURL} alt={matchedProfile.name} />
                <AvatarFallback className="bg-teal-950 text-teal-300 font-bold text-lg">
                  {matchedProfile.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 bg-teal-400 text-black rounded-full p-1 shadow">
                <Code2 className="w-3 h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Profile Details & Shared Skills */}
        <div className="px-6 py-4 space-y-4">
          <div className="bg-card/70 border border-border/70 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-sm text-foreground">{matchedProfile.name}</h4>
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
                    <span className="text-emerald-400 font-semibold">(Shared: {commonTech.join(', ')})</span>
                  )}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {matchedProfile.techStack.slice(0, 5).map((tech) => {
                    const isShared = commonTech.includes(tech);
                    return (
                      <span
                        key={tech}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                          isShared
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 font-semibold'
                            : 'bg-muted/60 text-muted-foreground border-border/50'
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
          <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5 text-xs text-muted-foreground flex items-center gap-2">
            <span className="text-emerald-400 font-semibold">💡 Icebreaker:</span>
            <span className="italic truncate">
              &ldquo;Hey {matchedProfile.name}, great to connect! What are you building right now?&rdquo;
            </span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-1 pb-2">
            <Button
              asChild
              size="lg"
              className="w-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold shadow-lg shadow-emerald-500/25 transition-all"
            >
              <Link href={`/dashboard/messages?userId=${matchedProfile.id}`} onClick={() => onOpenChange(false)}>
                <MessageSquare className="w-4 h-4 mr-2 text-slate-950" />
                Start Chatting Now
                <ArrowRight className="w-4 h-4 ml-1.5 text-slate-950" />
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Keep Swiping & Discover More
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
