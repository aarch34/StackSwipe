'use client';

import { useState, useEffect, useCallback } from 'react';
import { CoinRow, PixelHeart, PixelStar, Stacky } from '@/components/pixel/sprites';
import { PixelDissolve } from '@/components/pixel/pixel-dissolve';
import { useSwipeDrag } from '@/hooks/use-swipe-drag';
import Link from 'next/link';
import { Heart, SlidersHorizontal, Undo, X as XIcon, RotateCcw, Sparkles, PartyPopper } from '@/components/px-icons';
import confetti from 'canvas-confetti';
import { UserProfile } from '@/lib/data';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ProfileCard } from '@/components/profile-card';
import { useToast } from '@/hooks/use-toast';
import { MatchCelebrationDialog } from '@/components/match-celebration-dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';

const SWIPE_LIMIT = 10;
const networkingGoalOptions = [
    'Hackathon Teammate',
    'Looking for a Mentor / Mentee',
    'Looking for a Collaborator / Partner',
    'Looking to Hire / Get Hired',
    'Looking for Friends / Peers in my Field',
    'Looking to Learn or Teach Something',
    'Project / Startup Networking',
];

export default function SwipePage() {
  const { user, profile: userProfile, loading: authLoading, refreshMatches } = useAuth();
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
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
  
  const [locationFilter, setLocationFilter] = useState('');
  const [techStackFilter, setTechStackFilter] = useState('');
  const [experienceLevelFilter, setExperienceLevelFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [networkingGoalsFilter, setNetworkingGoalsFilter] = useState<string[]>([]);

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
        supabase.from('user_profiles').select('*').neq('id', user.id).limit(50),
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

      const alreadySwipedIds = new Set(
        swipesRes.data?.map(swipe => swipe.swiped_id) || []
      );
      setSwipedIds(alreadySwipedIds);

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

      // Transform Supabase data to match UserProfile interface
      const transformedProfiles: UserProfile[] = (profilesRes.data || [])
        .filter(p => !alreadySwipedIds.has(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          age: p.age,
          bio: p.bio,
          headline: p.headline,
          jobTitle: p.job_title,
          company: p.company,
          experienceLevel: p.experience_level,
          location: p.location,
          photoURL: p.photo_url,
          techStack: p.tech_stack || [],
          interests: p.interests || [],
          networkingTags: p.networking_tags || [],
          college: p.college,
          currentWork: p.current_work,
          links: p.links || {}
        }));

      setAllProfiles(transformedProfiles);
      setFilteredProfiles(transformedProfiles);

    } catch (error) {
      console.error("Failed to fetch profiles:", error);
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
  
  const handleNetworkingTagChange = (tag: string, checked: boolean) => {
    setNetworkingGoalsFilter(prev => {
        const currentTags = prev || [];
        const newTags = checked
            ? [...currentTags, tag]
            : currentTags.filter(t => t !== tag);
        return newTags;
    });
  };

  const handleApplyFilters = () => {
    let profiles = [...allProfiles];

    if (locationFilter.trim()) {
        profiles = profiles.filter(p => p.location?.toLowerCase().includes(locationFilter.toLowerCase()));
    }
    
    if (experienceLevelFilter.trim() && experienceLevelFilter !== 'any') {
        profiles = profiles.filter(p => p.experienceLevel?.toLowerCase().includes(experienceLevelFilter.toLowerCase()));
    }

    if (companyFilter.trim()) {
        profiles = profiles.filter(p => p.company?.toLowerCase().includes(companyFilter.toLowerCase()));
    }
    
    if (collegeFilter.trim()) {
        profiles = profiles.filter(p => p.college?.toLowerCase().includes(collegeFilter.toLowerCase()));
    }

    if (techStackFilter.trim()) {
        const skills = techStackFilter.toLowerCase().split(',').map(s => s.trim());
        profiles = profiles.filter(p => 
            p.techStack.some(skill => skills.includes(skill.toLowerCase()))
        );
    }

    if (networkingGoalsFilter.length > 0) {
        profiles = profiles.filter(p => 
            p.networkingTags.some(tag => 
                networkingGoalsFilter.some(filterGoal => 
                    tag.toLowerCase().includes(filterGoal.toLowerCase()) || 
                    filterGoal.toLowerCase().includes(tag.toLowerCase())
                )
            )
        );
    }
    
    setFilteredProfiles(profiles);
    setCurrentIndex(0);
    toast({
        title: 'Filters Applied',
        description: `Showing ${profiles.length} matching profiles.`,
    });
  };

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
    setSwipedIds(prev => new Set(prev).add(swipedProfile.id));
    setSwipes(prev => prev + 1);

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

  const handlePreviewMatch = () => {
    const demoProfile: UserProfile = currentProfile || {
      id: 'demo-alex',
      name: 'Alex Rivera',
      headline: 'Full-Stack Engineer & AI Collaborator',
      bio: 'Building real-time web applications and AI agents with Next.js, Supabase, and TypeScript.',
      jobTitle: 'Senior Software Engineer',
      company: 'TechFlow',
      experienceLevel: 'Senior',
      location: 'San Francisco, CA',
      photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
      techStack: ['Next.js', 'TypeScript', 'Supabase', 'Python', 'TailwindCSS'],
      interests: ['AI Systems', 'Open Source', 'Hackathons'],
      networkingTags: ['Collaborator / Partner', 'Hackathon Teammate'],
      college: 'UC Berkeley',
      email: 'alex.rivera@example.com',
    };
    setMatchedProfile(demoProfile);
    setShowMatchDialog(true);
  };
  
  const handleUndo = () => {
    if (currentIndex > 0) {
      setRewinding(true);
      setCurrentIndex(currentIndex - 1);
      if(swipes > 0) setSwipes(swipes - 1);
      toast({ title: 'Undid last swipe.'});
    }
  };

  const currentProfile = filteredProfiles[currentIndex];
  const limitReached = swipes >= SWIPE_LIMIT;
  const noMoreProfiles = !currentProfile && !loading;

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

  return (
    <main className="container mx-auto p-4 md:p-8">
      <h1 className="sr-only">Swipe through profiles</h1>
      <div className="flex flex-col items-center justify-start space-y-6">
        <div className="w-full max-w-sm flex justify-end">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <SlidersHorizontal className="mr-2 h-4 w-4" /> Filters
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
              <SheetHeader className="p-6">
                <SheetTitle className="font-headline flex items-center gap-2">
                  <SlidersHorizontal /> Filters
                </SheetTitle>
                <SheetDescription>
                  Refine your search to find the perfect match. Click apply when
                  you're done.
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="flex-1">
                <div className="space-y-4 p-6">
                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., San Francisco, CA"
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select
                      value={experienceLevelFilter}
                      onValueChange={setExperienceLevelFilter}
                    >
                      <SelectTrigger id="experienceLevel">
                        <SelectValue placeholder="Any experience level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any experience level</SelectItem>
                        <SelectItem value="Intern">Intern</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Lead">Lead / Staff</SelectItem>
                        <SelectItem value="Manager">Engineering Manager</SelectItem>
                        <SelectItem value="Founder">Founder / Co-Founder</SelectItem>
                        <SelectItem value="Freelancer">Freelancer / Consultant</SelectItem>
                        <SelectItem value="Student">Student / Self-Taught</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Networking Goals</Label>
                    <div className="space-y-2 rounded-md border p-4 max-h-56 overflow-y-auto">
                      {Array.from(new Set([
                        ...networkingGoalOptions,
                        ...(userProfile?.networkingTags || []),
                        ...allProfiles.flatMap((p) => p.networkingTags || []),
                      ])).map((goal) => (
                        <div
                          key={goal}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`filter-goal-${goal.replace(/\s/g, '-')}`}
                            checked={networkingGoalsFilter.includes(goal)}
                            onCheckedChange={(checked) =>
                              handleNetworkingTagChange(goal, !!checked)
                            }
                            className="flex-shrink-0"
                          />
                          <label
                            htmlFor={`filter-goal-${goal.replace(/\s/g, '-')}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center justify-between flex-1 cursor-pointer"
                          >
                            <span>{goal}</span>
                            {!networkingGoalOptions.includes(goal) && (
                              <span className="text-[10px] text-primary font-normal">(custom)</span>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      placeholder="e.g., Google"
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="college">College</Label>
                    <Input
                      id="college"
                      placeholder="e.g., MIT"
                      value={collegeFilter}
                      onChange={(e) => setCollegeFilter(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tech-stack">
                      Tech Stack (comma-separated)
                    </Label>
                    <Input
                      id="tech-stack"
                      placeholder="e.g., React, Python"
                      value={techStackFilter}
                      onChange={(e) => setTechStackFilter(e.target.value)}
                    />
                  </div>
                </div>
              </ScrollArea>
              <SheetFooter className="p-6 border-t">
                <SheetClose asChild>
                  <Button onClick={handleApplyFilters}>Apply Filters</Button>
                </SheetClose>
              </SheetFooter>
            </SheetContent>
          </Sheet>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center space-y-6">
  <div className="relative w-full">
    {loading ? (
      <Card className="flex flex-col items-center justify-center text-center h-[min(520px,70vh)]">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">
            Pulling threads to weave your network…
          </CardTitle>
        </CardHeader>
        <CardContent className="w-full px-4 sm:px-8">
          <Skeleton className="h-[min(380px,55vh)] w-full" />
        </CardContent>
      </Card>
    ) : limitReached || noMoreProfiles ? (
      <Card className="flex flex-col items-center justify-center text-center h-[min(520px,70vh)] p-6">
        <Stacky className="mb-3 w-20" />
        <CardHeader className="p-0 space-y-1 mb-4">
          <CardTitle className="font-headline text-4xl font-bold leading-none">
            {!noMoreProfiles
              ? "You're Out of Swipes!"
              : loadError
                ? "Couldn't Load Profiles"
                : allProfiles.length > 0 || swipedIds.size > 0
                  ? "You've Seen Everyone"
                  : "No Other Profiles Yet"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm max-w-xs mx-auto">
            {!noMoreProfiles
              ? `You've reached your daily limit of ${SWIPE_LIMIT} swipes. Check back tomorrow!`
              : loadError
                ? loadError
                : allProfiles.length > 0 || swipedIds.size > 0
                  ? "There are no more profiles to show right now. Clear any filters or check back later."
                  : "You're currently the only developer registered in the database! As more tech professionals sign up, their profiles will appear here."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex flex-col gap-2 w-full max-w-xs">
          <Button variant="default" size="sm" asChild className="w-full">
            <Link href="/dashboard/recommendations">
              <Sparkles className="w-4 h-4 mr-1.5" />
              Chat with StackBot AI
            </Link>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePreviewMatch}
            className="w-full"
          >
            <PartyPopper className="w-4 h-4 mr-1.5" />
            Preview Match Handshake Animation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProfiles()}
            className="w-full"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Check for New Profiles
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
            DEFERRED
          </div>

          {/* SWIPE RIGHT OVERLAY: CONNECT STAMP */}
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

          {/* SWIPE LEFT OVERLAY: DEFERRED STAMP */}
          {swipeAnimation === 'left' && (
            <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
              <div className="animate-stamp-pop-left flex items-center gap-2 border-4 border-[color:var(--c-ink)] bg-card px-5 py-2 font-label text-2xl text-card-foreground sm:text-3xl">
                <RotateCcw className="h-6 w-6" />
                DEFERRED
              </div>
            </div>
          )}

          <div className="h-full w-full overflow-y-auto">
            <ProfileCard profile={currentProfile} />
          </div>
        </div>
      </div>
    )}
  </div>


          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center space-x-5">
                <Button variant="outline" size="icon" aria-label="Defer this profile" className="h-16 w-16" onClick={() => handleSwipe('dislike')} disabled={limitReached || !!swipeAnimation || !currentProfile}>
                    <XIcon className="h-8 w-8" />
                </Button>
                <Button variant="secondary" size="icon" aria-label="Undo last swipe" className="h-12 w-12" onClick={handleUndo} disabled={currentIndex === 0 || limitReached || !!swipeAnimation || !currentProfile}>
                    <Undo className="h-6 w-6" />
                </Button>
                <Button size="icon" aria-label="Connect with this profile" className="h-16 w-16" onClick={() => handleSwipe('like')} disabled={limitReached || !!swipeAnimation || !currentProfile}>
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

      {/* MATCH CELEBRATION DIALOG */}
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
