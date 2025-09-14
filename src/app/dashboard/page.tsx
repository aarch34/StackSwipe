
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
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import { addDoc, collection, getDocs, query, where, serverTimestamp, doc, setDoc } from 'firebase/firestore';


const SWIPE_LIMIT = 10;

export default function SwipePage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipedIds, setSwipedIds] = useState<Set<string>>(new Set());
  const [swipes, setSwipes] = useState(0);
  const [swipeAnimation, setSwipeAnimation] = useState<'left' | 'right' | ''>('');
  const { toast } = useToast();

  useEffect(() => {
    async function fetchProfiles() {
      if (!user) return;
      try {
        setLoading(true);
        // Fetch users that the current user has already swiped on
        const swipesQuery = query(collection(db, 'swipes'), where('swiperId', '==', user.uid));
        const swipesSnapshot = await getDocs(swipesQuery);
        const alreadySwipedIds = new Set(swipesSnapshot.docs.map(doc => doc.data().swipedId));
        setSwipedIds(alreadySwipedIds);
        
        const allProfiles = await getAllUsers();
        // Filter out the current user's profile and profiles they've already swiped
        const filteredProfiles = allProfiles.filter(p => p.id !== user.uid && !alreadySwipedIds.has(p.id));
        setProfiles(filteredProfiles);

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

  const checkForMatch = async (swipedProfile: UserProfile) => {
    if (!user) return;

    // Check if the other person has liked the current user
    const q = query(
      collection(db, "swipes"),
      where("swiperId", "==", swipedProfile.id),
      where("swipedId", "==", user.uid),
      where("action", "==", "like")
    );

    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      // It's a match!
      console.log(`It's a match with ${swipedProfile.name}!`);
      toast({
        title: `It's a match!`,
        description: `You and ${swipedProfile.name} have liked each other.`,
      });
      // Create a match document
      const matchId = [user.uid, swipedProfile.id].sort().join('_');
      await setDoc(doc(db, "matches", matchId), {
        id: matchId,
        userIds: [user.uid, swipedProfile.id],
        matchedAt: serverTimestamp(),
      });
    }
  };

  const handleSwipe = async (action: 'like' | 'dislike') => {
    if (!user || !profiles[currentIndex]) return;
    if (swipes >= SWIPE_LIMIT) {
      toast({
        title: 'Daily limit reached',
        description: 'You have used all your swipes for today. Come back tomorrow!',
        variant: 'destructive',
      });
      return;
    }
    
    const swipedProfile = profiles[currentIndex];
    
    setSwipeAnimation(action === 'like' ? 'right' : 'left');
    
    try {
        // Record the swipe in Firestore
        await addDoc(collection(db, 'swipes'), {
            swiperId: user.uid,
            swipedId: swipedProfile.id,
            action: action,
            timestamp: serverTimestamp(),
        });

        if (action === 'like') {
            await checkForMatch(swipedProfile);
        }

    } catch (error) {
         console.error("Error recording swipe:", error);
         toast({ title: 'Error', description: 'Could not save your swipe.', variant: 'destructive'});
         setSwipeAnimation(''); // Reset animation on error
         return; // Don't proceed
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
    // Note: A true undo would require deleting the swipe from Firestore.
    // This is a simplified version for UI only.
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      if(swipes > 0) setSwipes(swipes - 1);
      toast({ title: 'Undid last swipe.'});
    }
  };

  const currentProfile = profiles[currentIndex];
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
                <SheetContent>
                    <SheetHeader>
                        <SheetTitle className="font-headline flex items-center gap-2">
                            <SlidersHorizontal/> Filters
                        </SheetTitle>
                        <SheetDescription>
                            Refine your search to find the perfect match.
                        </SheetDescription>
                    </SheetHeader>
                    <div className="py-4 space-y-4">
                        <div>
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" placeholder="e.g., San Francisco, CA" />
                        </div>
                        <div>
                            <Label htmlFor="tech-stack">Tech Stack</Label>
                            <Input id="tech-stack" placeholder="e.g., React, Python" />
                        </div>
                        <Button className="w-full" disabled>Apply Filters</Button>
                    </div>
                </SheetContent>
            </Sheet>
        </div>

        <div className="w-full max-w-sm flex flex-col items-center space-y-6">
          <div className="relative h-[700px] w-full">
              {loading ? (
                <Card className="flex flex-col items-center justify-center text-center h-full">
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Finding Profiles...</CardTitle>
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
                            {noMoreProfiles ? "Check back later for new profiles." : `You've reached your daily limit of ${SWIPE_LIMIT} swipes. Come back tomorrow!`}
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
