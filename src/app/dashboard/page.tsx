'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { CoinRow, PixelHeart, PixelStar, Stacky } from '@/components/pixel/sprites';
import { PixelDissolve } from '@/components/pixel/pixel-dissolve';
import { useSwipeDrag } from '@/hooks/use-swipe-drag';
import Link from 'next/link';
import { Heart, Undo, X as XIcon, RotateCcw, Sparkles } from '@/components/px-icons';
import confetti from 'canvas-confetti';
import { UserProfile, profileFromRow } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ProfileCard } from '@/components/profile-card';
import { DiscoveryFiltersSheet } from '@/components/discovery-filters';
import { useToast } from '@/hooks/use-toast';
import { MatchCelebrationDialog } from '@/components/match-celebration-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/lib/supabase';
import {
  EMPTY_FILTERS,
  applyDiscoveryFilters,
  countActiveFilters,
  getDiscoveryLabels,
  relevanceScore,
  type DiscoveryFilters,
} from '@/lib/discovery';

const SWIPE_LIMIT = 10;
const DECK_SIZE = 200;

export default function SwipePage() {
  const { user, profile: userProfile, loading: authLoading, refreshMatches } = useAuth();
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
  const [filters, setFilters] = useState<DiscoveryFilters>(EMPTY_FILTERS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [swipes, setSwipes] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState<'left' | 'right' | ''>('');
  const [rewinding, setRewinding] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<UserProfile | null>(null);
  const [showMatchDialog, setShowMatchDialog] = useState(false);
  const { toast } = useToast();

  // Read through a ref so a profile refresh does not reshuffle the deck mid-swipe.
  const myProfile = useRef(userProfile);
  myProfile.current = userProfile;

  const fetchProfiles = useCallback(async () => {
    if (!user) {
      if (!authLoading) {
        setLoading(false);
      }
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      // Safety timeout so slow networks never hang on the skeleton
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 10000)
      );

      const queryPromise = Promise.all([
        supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id),
        supabase.from('discoverable_profiles').select('*').limit(DECK_SIZE),
        supabase.auth.getSession(),
      ]);

      const result = await Promise.race([queryPromise, timeoutPromise]);

      if ('timeout' in result) {
        console.warn('Profile fetch reached the 10s timeout');
        setLoadError('The database took too long to respond. Please check your connection and try again.');
        return;
      }

      const [swipesRes, profilesRes, sessionRes] = result;

      // Row Level Security returns an empty list, not an error, without a session
      if (!sessionRes.data.session) {
        setLoadError('Your session has expired. Please log out and log back in.');
        return;
      }

      if (swipesRes.error) {
        console.error('Error fetching swipes:', swipesRes.error);
      }

      setSwipedIds(new Set(swipesRes.data?.map((swipe) => swipe.swiped_id) || []));

      if (profilesRes.error) {
        console.error('Error fetching profiles:', profilesRes.error);
        setLoadError('The profiles could not be loaded from the database. Please try again.');
        toast({
          title: 'Notice',
          description: 'Could not load profiles right now.',
          variant: 'destructive',
        });
        return;
      }

      // Most relevant first. sort() is stable, so ties keep the most recently active order.
      const ranked = (profilesRes.data || [])
        .map(profileFromRow)
        .sort((a, b) => relevanceScore(myProfile.current, b) - relevanceScore(myProfile.current, a));

      setAllProfiles(ranked);
      setFilteredProfiles(ranked);
      setFilters(EMPTY_FILTERS);
      setCurrentIndex(0);
    } catch (error) {
      console.error('Failed to fetch profiles:', error);
      setLoadError('The profiles could not be loaded. Please try again.');
      toast({
        title: 'Notice',
        description: 'Could not load profiles. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [user, authLoading, toast]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleApplyFilters = (next: DiscoveryFilters) => {
    const profiles = applyDiscoveryFilters(
      allProfiles.filter((profile) => !swipedIds.has(profile.id)),
      next,
      userProfile
    );
    setFilters(next);
    setFilteredProfiles(profiles);
    setCurrentIndex(0);
    if (countActiveFilters(next) > 0) {
      toast({
        title: 'Filters applied',
        description: `${profiles.length} ${profiles.length === 1 ? 'person matches' : 'people match'} your filters.`,
      });
    }
  };

  const removeFromDeck = (id: string) => {
    setAllProfiles((profiles) => profiles.filter((profile) => profile.id !== id));
    setFilteredProfiles((profiles) => profiles.filter((profile) => profile.id !== id));
  };

  const goalOptions = useMemo(
    () => Array.from(new Set(allProfiles.flatMap((profile) => profile.networkingTags || []))).filter(Boolean),
    [allProfiles]
  );

  const handleSwipe = async (action: 'like' | 'dislike') => {
    if (!user || !filteredProfiles[currentIndex]) return;
    if (swipes >= SWIPE_LIMIT) {
      toast({
        title: 'Daily limit reached',
        description: 'You have used all your swipes for today. Come back tomorrow!',
        variant: 'destructive',
      });
      return;
    }

    const swipedProfile = filteredProfiles[currentIndex];

    // Confetti sprinkles and sparkles burst on swipe right (Connect)
    if (action === 'like') {
      confetti({
        particleCount: 28,
        spread: 60,
        origin: { x: 0.65, y: 0.65 },
        colors: ['#ff7a9a', '#ffd83f', '#7a56bd', '#2fb84a', '#f2572b'],
        shapes: ['square'],
        flat: true,
        ticks: 140,
        gravity: 0.9,
        scalar: 1.2,
        disableForReducedMotion: true,
      });
    }

    // Instant Optimistic UI: Trigger animation & advance card with smooth timing
    setRewinding(false);
    setSwipeAnimation(action === 'like' ? 'right' : 'left');
    setSwipedIds((prev) => new Set(prev).add(swipedProfile.id));
    setSwipes((prev) => prev + 1);

    setTimeout(() => {
      setCurrentIndex((prevIndex) => prevIndex + 1);
      setSwipeAnimation('');
    }, 350);

    // Background asynchronous database update (non-blocking)
    (async () => {
      try {
        // 1. Record the swipe (upsert to handle re-swipes or duplicates cleanly)
        const { error: swipeError } = await supabase
          .from('swipes')
          .upsert(
            {
              swiper_id: user.id,
              swiped_id: swipedProfile.id,
              direction: action === 'like' ? 'right' : 'left',
            },
            { onConflict: 'swiper_id,swiped_id' }
          );

        if (swipeError && swipeError.code !== '23505') {
          console.warn('Error saving swipe:', swipeError);
        }

        if (action === 'like') {
          // 2. Check for reciprocal right swipe
          const { data: mutualSwipe } = await supabase
            .from('swipes')
            .select('id, direction')
            .eq('swiper_id', swipedProfile.id)
            .eq('swiped_id', user.id)
            .eq('direction', 'right')
            .maybeSingle();

          // 3. Check if match already exists in matches table
          const { data: existingMatch } = await supabase
            .from('matches')
            .select('id, user_ids')
            .contains('user_ids', [user.id, swipedProfile.id])
            .maybeSingle();

          let matchConfirmed = Boolean(existingMatch);

          // If reciprocal like detected and match row doesn't exist yet, create it
          if (mutualSwipe && !existingMatch) {
            const { data: createdMatch, error: matchInsertError } = await supabase
              .from('matches')
              .insert({
                user_ids: [user.id, swipedProfile.id],
              })
              .select()
              .maybeSingle();

            if (matchInsertError) {
              console.warn('Matches insert notice:', matchInsertError);
            }
            if (createdMatch || !matchInsertError) {
              matchConfirmed = true;
            }
          }

          // If match formed via either method, refresh state and celebrate!
          if (matchConfirmed || mutualSwipe) {
            // Instantly refresh user's matches in real-time
            await refreshMatches();

            // Trigger full Match Celebration Screen
            setMatchedProfile(swipedProfile);
            setShowMatchDialog(true);
          }
        }
      } catch (err) {
        console.warn('Background swipe error:', err);
      }
    })();
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      setRewinding(true);
      setCurrentIndex(currentIndex - 1);
      if (swipes > 0) setSwipes(swipes - 1);
      toast({ title: 'Undid last swipe.' });
    }
  };

  const currentProfile = filteredProfiles[currentIndex];
  const limitReached = swipes >= SWIPE_LIMIT;
  const noMoreProfiles = !currentProfile && !loading;
  const filtersActive = countActiveFilters(filters) > 0;

  const swipeLocked = limitReached || !!swipeAnimation || !currentProfile;
  const { ref: dragRef, handlers: dragHandlers } = useSwipeDrag({
    onSwipe: (direction) => handleSwipe(direction === 'right' ? 'like' : 'dislike'),
    disabled: swipeLocked,
  });

  // Keyboard swiping, ignored while typing or while a dialog or the filter panel is open.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [role="listbox"], [role="menu"]')) return;

      if (e.key === 'ArrowLeft' && !swipeLocked) {
        e.preventDefault();
        handleSwipe('dislike');
      } else if (e.key === 'ArrowRight' && !swipeLocked) {
        e.preventDefault();
        handleSwipe('like');
      } else if (e.key.toLowerCase() === 'z' && !swipeLocked && currentIndex > 0) {
        handleUndo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const animationClass =
    swipeAnimation === 'left' ? 'animate-swipe-out-left' :
    swipeAnimation === 'right' ? 'animate-swipe-out-right' :
    '';

  const emptyTitle = !noMoreProfiles
    ? "You're out of swipes for today"
    : loadError
      ? "Couldn't load profiles"
      : filtersActive
        ? 'Nobody matches those filters yet'
        : 'Your next great conversation could be one swipe away';

  const emptyDescription = !noMoreProfiles
    ? `You've used your ${SWIPE_LIMIT} swipes. Check back tomorrow, and keep your chats going in the meantime.`
    : loadError
      ? loadError
      : filtersActive
        ? 'Try removing a filter or two to see more people.'
        : "You've seen everyone for now. New people join all the time, so check back soon.";

  return (
    <main className="container mx-auto p-4 md:p-8">
      <div className="flex flex-col items-center justify-start space-y-5">
        <div className="flex w-full max-w-sm items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-headline text-3xl font-bold leading-none">Find people who get where you&apos;re going.</h1>
            <p className="mt-1 text-xs text-muted-foreground">Someone here might have the answer you&apos;re looking for.</p>
          </div>
          <div className="shrink-0">
            <DiscoveryFiltersSheet filters={filters} goalOptions={goalOptions} onApply={handleApplyFilters} />
          </div>
        </div>

        <div className="flex w-full max-w-sm flex-col items-center space-y-6">
          <div className="relative w-full">
            {loading ? (
              <Card className="flex h-[min(520px,70vh)] flex-col items-center justify-center text-center">
                <CardHeader>
                  <CardTitle className="font-headline text-2xl">Finding your people…</CardTitle>
                </CardHeader>
                <CardContent className="w-full px-4 sm:px-8">
                  <Skeleton className="h-[min(380px,55vh)] w-full" />
                </CardContent>
              </Card>
            ) : limitReached || noMoreProfiles ? (
              <Card className="flex h-[min(520px,70vh)] flex-col items-center justify-center p-6 text-center">
                <Stacky className="mb-3 w-20" />
                <CardHeader className="mb-4 space-y-1 p-0">
                  <CardTitle className="font-headline text-4xl font-bold leading-none">{emptyTitle}</CardTitle>
                  <CardDescription className="mx-auto max-w-xs text-xs sm:text-sm">{emptyDescription}</CardDescription>
                </CardHeader>
                <CardContent className="flex w-full max-w-xs flex-col gap-2 p-0">
                  {filtersActive && noMoreProfiles && !loadError && (
                    <Button variant="default" size="sm" className="w-full" onClick={() => handleApplyFilters(EMPTY_FILTERS)}>
                      Clear filters
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" asChild className="w-full">
                    <Link href="/dashboard/recommendations">
                      <Sparkles className="mr-1.5 h-4 w-4" />
                      Ask StackBot a question
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fetchProfiles()} className="w-full">
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    Check for new people
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="relative h-[min(520px,70vh)] w-full">
                {/* The next card waits underneath */}
                {filteredProfiles[currentIndex + 1] && (
                  <div aria-hidden="true" className="px-box absolute inset-0 translate-x-2 translate-y-2 rotate-1 bg-secondary" />
                )}

                <div
                  key={currentProfile.id}
                  ref={dragRef}
                  {...dragHandlers}
                  className={cn(
                    'px-swipe-card px-raised absolute inset-0 cursor-grab overflow-hidden bg-card active:cursor-grabbing',
                    swipeAnimation ? animationClass : rewinding ? 'animate-rewind' : 'animate-card-in'
                  )}
                >
                  <PixelDissolve active={!!swipeAnimation} />

                  {/* Stamps fade in with the drag */}
                  <div aria-hidden="true" className="px-stamp-like pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2 -rotate-[8deg] border-4 border-[color:var(--c-ink)] bg-[color:var(--c-leaf)] px-4 py-1 font-label text-2xl text-[color:var(--c-ink)]">
                    CONNECT
                  </div>
                  <div aria-hidden="true" className="px-stamp-nope pointer-events-none absolute left-1/2 top-16 z-40 -translate-x-1/2 rotate-[8deg] border-4 border-[color:var(--c-ink)] bg-card px-4 py-1 font-label text-2xl text-card-foreground">
                    SKIP
                  </div>

                  {swipeAnimation === 'right' && (
                    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
                      <div className="animate-stamp-pop flex items-center gap-2 border-4 border-[color:var(--c-ink)] bg-[color:var(--c-leaf)] px-5 py-2 font-label text-2xl text-[color:var(--c-ink)] sm:text-3xl">
                        <Sparkles className="h-7 w-7" />
                        CONNECT
                      </div>
                      <PixelStar className="animate-sparkle-float absolute left-1/4 top-1/4 h-8 w-8" />
                      <PixelHeart className="animate-sparkle-float absolute right-1/4 top-1/3 h-7 w-7 [animation-delay:80ms]" />
                      <PixelStar className="animate-sparkle-float absolute bottom-1/3 left-1/3 h-6 w-6 [animation-delay:120ms]" />
                      <PixelHeart className="animate-sparkle-float absolute right-1/3 top-1/2 h-6 w-6 [animation-delay:160ms]" />
                    </div>
                  )}

                  {swipeAnimation === 'left' && (
                    <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
                      <div className="animate-stamp-pop-left flex items-center gap-2 border-4 border-[color:var(--c-ink)] bg-card px-5 py-2 font-label text-2xl text-card-foreground sm:text-3xl">
                        <RotateCcw className="h-6 w-6" />
                        SKIP
                      </div>
                    </div>
                  )}

                  <div className="h-full w-full overflow-y-auto">
                    <ProfileCard
                      profile={currentProfile}
                      labels={getDiscoveryLabels(userProfile, currentProfile)}
                      onBlocked={() => removeFromDeck(currentProfile.id)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center space-x-5">
              <Button variant="outline" size="icon" aria-label="Skip this person" className="h-16 w-16" onClick={() => handleSwipe('dislike')} disabled={swipeLocked}>
                <XIcon className="h-8 w-8" />
              </Button>
              <Button variant="secondary" size="icon" aria-label="Undo last swipe" className="h-12 w-12" onClick={handleUndo} disabled={currentIndex === 0 || swipeLocked}>
                <Undo className="h-6 w-6" />
              </Button>
              <Button size="icon" aria-label="Connect with this person" className="h-16 w-16" onClick={() => handleSwipe('like')} disabled={swipeLocked}>
                <Heart className="h-8 w-8" />
              </Button>
            </div>
            <div className="flex min-h-12 flex-col items-center gap-2 text-center text-sm text-muted-foreground">
              {!limitReached && !noMoreProfiles && (
                <>
                  <CoinRow total={SWIPE_LIMIT} used={swipes} />
                  <p>Swipes remaining: {SWIPE_LIMIT - swipes} / {SWIPE_LIMIT}</p>
                  <p className="hidden text-xs md:block">Drag the card, or use the arrow keys. Z to undo.</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <MatchCelebrationDialog
        open={showMatchDialog}
        onOpenChange={setShowMatchDialog}
        currentUser={user}
        currentUserProfile={userProfile}
        matchedProfile={matchedProfile}
      />
    </main>
  );
}
