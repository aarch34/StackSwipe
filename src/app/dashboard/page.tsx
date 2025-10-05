
'use client';

import { useState, useEffect } from 'react';
import { Heart, SlidersHorizontal, Undo, X as XIcon } from 'lucide-react';
import { UserProfile } from '@/lib/data';
import { getAllUsers } from '@/lib/users';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ProfileCard } from '@/components/profile-card';
import { useToast } from '@/hooks/use-toast';
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
import { db } from '@/lib/firebase';
import { addDoc, collection, getDocs, query, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';


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
  const { user } = useAuth();
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [swipes, setSwipes] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState<'left' | 'right' | ''>('');
  const { toast } = useToast();
  
  const [locationFilter, setLocationFilter] = useState('');
  const [techStackFilter, setTechStackFilter] = useState('');
  const [experienceLevelFilter, setExperienceLevelFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [networkingGoalsFilter, setNetworkingGoalsFilter] = useState<string[]>([]);


  useEffect(() => {
    async function fetchProfiles() {
      if (!user) return;
      try {
        setLoading(true);
        const swipesQuery = query(collection(db, 'swipes'), where('swiperId', '==', user.uid));
        const swipesSnapshot = await getDocs(swipesQuery);
        const alreadySwipedIds = new Set(swipesSnapshot.docs.map(doc => doc.data().swipedId));
        setSwipedIds(alreadySwipedIds);
        
        const profiles = await getAllUsers();
        const availableProfiles = profiles.filter(p => p.id !== user.uid && !alreadySwipedIds.has(p.id));
        setAllProfiles(availableProfiles);
        setFilteredProfiles(availableProfiles);

      } catch (error) {
        console.error("Failed to fetch profiles:", error);
        toast({
          title: 'Error',
          description: 'Could not load profiles. Please try again later.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    }
    fetchProfiles();
  }, [user, toast]);
  
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
        profiles = profiles.filter(p => p.experienceLevel === experienceLevelFilter);
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
            p.networkingTags.some(tag => networkingGoalsFilter.includes(tag))
        );
    }
    
    setFilteredProfiles(profiles);
    setCurrentIndex(0); // Reset swipe index to start from the beginning of the filtered list
    toast({
        title: 'Filters Applied',
        description: `Showing ${profiles.length} matching profiles.`,
    });
  };

  const checkForMatch = async (swipedProfile: UserProfile) => {
    if (!user) return;

    const q = query(
      collection(db, "swipes"),
      where("swiperId", "==", swipedProfile.id),
      where("swipedId", "==", user.uid),
      where("action", "==", "like")
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      console.log(`It's a match with ${swipedProfile.name}!`);
      toast({
        title: `It's a match!`,
        description: `You and ${swipedProfile.name} have liked each other.`,
      });
      const matchId = [user.uid, swipedProfile.id].sort().join('_');
      await setDoc(doc(db, "matches", matchId), {
        id: matchId,
        userIds: [user.uid, swipedProfile.id],
        matchedAt: serverTimestamp(),
      });
    }
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
    
    setSwipeAnimation(action === 'like' ? 'right' : 'left');
    
    try {
        await addDoc(collection(db, 'swipes'), {
            swiperId: user.uid,
            swipedId: swipedProfile.id,
            action: action,
            timestamp: serverTimestamp(),
        });
        
        setSwipedIds(prev => new Set(prev).add(swipedProfile.id));

        if (action === 'like') {
            await checkForMatch(swipedProfile);
        }

    } catch (error) {
         console.error("Error recording swipe:", error);
         toast({ title: 'Error', description: 'Could not save your swipe.', variant: 'destructive'});
         setSwipeAnimation('');
         return;
    }

    setTimeout(() => {
      toast({
        title: `You ${action}d ${swipedProfile.name}`,
      });

      setSwipes(swipes + 1);
      setCurrentIndex((prevIndex) => (prevIndex + 1));
      setSwipeAnimation('');
    }, 300);
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
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="Intern">Intern</SelectItem>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Mid-level">Mid-level</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                        <SelectItem value="Lead">Lead</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Networking Goals</Label>
                    <div className="space-y-2 rounded-md border p-4">
                      {networkingGoalOptions.map((goal) => (
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
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                          >
                            {goal}
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
          <div className="relative h-[700px] w-full">
              {loading ? (
                <Card className="flex flex-col items-center justify-center text-center h-full">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Pulling threads to weave your network…</CardTitle>
                    </CardHeader>
                    <CardContent className='w-full px-12'>
                       <Skeleton className="h-[450px] w-full" />
                    </CardContent>
                </Card>
              ) : limitReached || noMoreProfiles ? (
                  <Card className="flex flex-col items-center justify-center text-center h-full">
                      <CardHeader>
                          <CardTitle className="font-headline text-2xl">
                            {noMoreProfiles ? "That's everyone for now!" : "You're out of swipes!"}
                          </CardTitle>
                      </CardHeader>
                      <CardContent>
                          <p>
                            {noMoreProfiles ? "Check back later for new profiles or adjust your filters." : `You've reached your daily limit of ${SWIPE_LIMIT} swipes. Come back tomorrow!`}
                          </p>
                      </CardContent>
                  </Card>
              ) : (
                <div className={cn("absolute w-full h-full", animationClass)}>
                  <ProfileCard profile={currentProfile} />
                </div>
              )}
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center justify-center space-x-4">
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-2 border-yellow-500 text-yellow-500 hover:bg-yellow-100 hover:text-yellow-600" onClick={() => handleSwipe('dislike')} disabled={limitReached || !!swipeAnimation || !currentProfile}>
                    <XIcon className="h-8 w-8" />
                </Button>
                <Button variant="outline" size="icon" className="h-12 w-12 rounded-full border-2" onClick={handleUndo} disabled={currentIndex === 0 || limitReached || !!swipeAnimation || !currentProfile}>
                    <Undo className="h-6 w-6" />
                </Button>
                <Button variant="outline" size="icon" className="h-16 w-16 rounded-full border-2 border-green-500 text-green-500 hover:bg-green-100 hover:text-green-600" onClick={() => handleSwipe('like')} disabled={limitReached || !!swipeAnimation || !currentProfile}>
                    <Heart className="h-8 w-8" />
                </Button>
            </div>
            <div className="text-center text-muted-foreground h-5">
                {!limitReached && !noMoreProfiles && <p>Swipes remaining: {SWIPE_LIMIT - swipes} / {SWIPE_LIMIT}</p>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
