'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Heart, SlidersHorizontal, Undo, X as XIcon, Users, RotateCcw, Sparkles, PartyPopper } from 'lucide-react';
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
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [swipes, setSwipes] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState<'left' | 'right' | ''>('');
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
      
      // Safety timeout promise (2.5s max) so slow networks never hang on the skeleton
      const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
        setTimeout(() => resolve({ timeout: true }), 2500)
      );

      const queryPromise = Promise.all([
        supabase.from('swipes').select('swiped_id').eq('swiper_id', user.id),
        supabase.from('users').select('*').neq('id', user.id).limit(50),
      ]);

      const result = await Promise.race([queryPromise, timeoutPromise]);

      if ('timeout' in result) {
        console.warn('Profile fetch reached 2.5s timeout; displaying empty state gracefully');
        setLoading(false);
        return;
      }

      const [swipesRes, profilesRes] = result;

      const alreadySwipedIds = new Set(
        swipesRes.data?.map(swipe => swipe.swiped_id) || []
      );
      setSwipedIds(alreadySwipedIds);

      if (profilesRes.error) {
        console.error('Error fetching profiles:', profilesRes.error);
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
          links: p.links || {},
          email: p.email
        }));

      setAllProfiles(transformedProfiles);
      setFilteredProfiles(transformedProfiles);

    } catch (error) {
      console.error("Failed to fetch profiles:", error);
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
        colors: ['#10b981', '#34d399', '#6ee7b7', '#f59e0b', '#38bdf8'],
        ticks: 140,
        gravity: 0.9,
        scalar: 0.9,
      });
    }

    // Instant Optimistic UI: Trigger animation & advance card with smooth timing
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
      setCurrentIndex(currentIndex - 1);
      if(swipes > 0) setSwipes(swipes - 1);
      toast({ title: 'Undid last swipe.'});
    }
  };

  const currentProfile = filteredProfiles[currentIndex];
  const limitReached = swipes >= SWIPE_LIMIT;
  const noMoreProfiles = !currentProfile && !loading;

  const animationClass = 
      swipeAnimation === 'left' ? 'animate-swipe-out-left' : 
      swipeAnimation === 'right' ? 'animate-swipe-out-right' : 
      '';

  return (
    <main className="container mx-auto p-4 md:p-8">
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
      <Card className="flex flex-col items-center justify-center text-center h-[min(520px,70vh)] p-6 shadow-xl border-border/80">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary mb-3 shadow-sm">
          <Users className="w-7 h-7" />
        </div>
        <CardHeader className="p-0 space-y-1 mb-4">
          <CardTitle className="font-headline text-xl sm:text-2xl font-bold tracking-tight">
            {noMoreProfiles ? "No Other Profiles Yet" : "You're Out of Swipes!"}
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm max-w-xs mx-auto">
            {noMoreProfiles
              ? "You're currently the only developer registered in the database! As more tech professionals sign up, their profiles will appear here."
              : `You've reached your daily limit of ${SWIPE_LIMIT} swipes. Check back tomorrow!`}
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
            className="w-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20"
          >
            <PartyPopper className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
            Preview Match Handshake Animation
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchProfiles()}
            className="w-full text-xs text-muted-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            Check for New Profiles
          </Button>
        </CardContent>
      </Card>
    ) : (
      <div
        className={cn(
          'relative w-full h-[min(520px,70vh)] overflow-hidden rounded-2xl',
          animationClass
        )}
      >
        {/* SWIPE RIGHT OVERLAY: SPARKLES & CONNECT STAMP */}
        {swipeAnimation === 'right' && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-emerald-500/15 rounded-2xl border-2 border-emerald-500/60 backdrop-blur-[1px] shadow-[0_0_35px_rgba(16,185,129,0.5)]">
            <div className="animate-stamp-pop border-4 border-emerald-400 bg-emerald-950/95 text-emerald-300 font-black text-2xl sm:text-3xl px-6 py-2.5 rounded-2xl shadow-[0_0_35px_rgba(16,185,129,0.9)] flex items-center gap-2.5 tracking-widest uppercase">
              <Sparkles className="w-7 h-7 text-emerald-400 animate-spin" />
              CONNECT
            </div>
            {/* Floating Sparkles & Sprinkles */}
            <span className="absolute top-1/4 left-1/4 text-2xl animate-sparkle-float">✨</span>
            <span className="absolute top-1/3 right-1/4 text-xl animate-sparkle-float" style={{ animationDelay: '80ms' }}>🌟</span>
            <span className="absolute bottom-1/3 left-1/3 text-2xl animate-sparkle-float" style={{ animationDelay: '120ms' }}>💚</span>
            <span className="absolute top-1/2 right-1/3 text-xl animate-sparkle-float" style={{ animationDelay: '160ms' }}>⚡</span>
          </div>
        )}

        {/* SWIPE LEFT OVERLAY: APPT TECH DEFER / DISMISS STAMP */}
        {swipeAnimation === 'left' && (
          <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-slate-900/40 rounded-2xl border-2 border-slate-500/40 backdrop-blur-[1px] shadow-[0_0_20px_rgba(148,163,184,0.3)]">
            <div className="animate-stamp-pop-left border-4 border-slate-400 bg-slate-950/95 text-slate-200 font-black text-2xl sm:text-3xl px-6 py-2.5 rounded-2xl shadow-[0_0_25px_rgba(148,163,184,0.5)] flex items-center gap-2.5 tracking-widest uppercase">
              <RotateCcw className="w-6 h-6 text-slate-400" />
              DEFERRED
            </div>
            {/* Drifting smoke & wind sprinkles */}
            <span className="absolute top-1/3 right-1/3 text-lg opacity-60 animate-sparkle-float">💨</span>
            <span className="absolute bottom-1/2 left-1/4 text-sm opacity-40 animate-sparkle-float" style={{ animationDelay: '90ms' }}>💭</span>
          </div>
        )}

        <div className="h-full w-full overflow-y-auto">
          <ProfileCard profile={currentProfile} />
        </div>
      </div>
    )}
  </div>


          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-100 hover:text-yellow-600 transition-all hover:scale-105 active:scale-95" onClick={() => handleSwipe('dislike')} disabled={limitReached || !!swipeAnimation || !currentProfile}>
                    <XIcon className="h-8 w-8" />
                </Button>
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-2 hover:scale-105 active:scale-95 transition-all" onClick={handleUndo} disabled={currentIndex === 0 || limitReached || !!swipeAnimation || !currentProfile}>
                    <Undo className="h-6 w-6" />
                </Button>
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-100 hover:text-green-600 transition-all hover:scale-105 active:scale-95 shadow-sm shadow-green-500/20" onClick={() => handleSwipe('like')} disabled={limitReached || !!swipeAnimation || !currentProfile}>
                    <Heart className="h-8 w-8" />
                </Button>
            </div>
            <div className="text-center text-muted-foreground h-5">
                {!limitReached && !noMoreProfiles && <p>Swipes remaining: {SWIPE_LIMIT - swipes} / {SWIPE_LIMIT}</p>}
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
