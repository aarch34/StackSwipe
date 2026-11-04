'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import type { UserProfile, Match } from '@/lib/data';

export type AuthUser = User & {
  uid: string;
  displayName?: string | null;
  photoURL?: string | null;
};

export const enrichUser = (u: User | null): AuthUser | null => {
  if (!u) return null;
  const metadata: any = u.user_metadata || {};
  return Object.assign(u, {
    uid: u.id,
    displayName: metadata.full_name || metadata.name || (u.email ? u.email.split('@')[0] : null),
    photoURL: metadata.avatar_url || metadata.picture || null,
  });
};

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  profile: UserProfile | null;
  hasProfile: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  matches: Match[];
  setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
  refreshMatches: () => Promise<void>;
  updateProfile: (profile: UserProfile) => Promise<void>;
  saveOnboardingProgress: (step: number, stepData: Partial<UserProfile>) => Promise<void>;
  login: (email: string, pass: string) => Promise<any>;
  signup: (email: string, pass: string) => Promise<any>;
  loginWithGoogle: () => Promise<any>;
  loginWithGithub: () => Promise<any>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean>(false);
  const [onboardingStep, setOnboardingStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [matches, setMatches] = useState<Match[]>([]);

  const router = useRouter();

  const loadUserProfile = async (currentUser: User) => {
    try {
      // Look up user by internal id or firebase_uid column
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .or(`id.eq.${currentUser.id},firebase_uid.eq.${currentUser.id}`)
        .maybeSingle();

      let isCompleted = false;
      let currentStep = 0;

      // Check localStorage cache for resilient onboarding status
      if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(`stackswipe_onboarding_${currentUser.id}`);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            if (parsed.onboarding_completed) isCompleted = true;
            if (typeof parsed.onboarding_step === 'number') currentStep = parsed.onboarding_step;
          } catch (e) {
            console.warn('Error reading cached onboarding status:', e);
          }
        }
      }

      if (data && !error) {
        if (typeof data.onboarding_completed === 'boolean') {
          isCompleted = data.onboarding_completed;
        }
        if (typeof data.onboarding_step === 'number') {
          currentStep = data.onboarding_step;
        }

        const metadata: any = currentUser.user_metadata || {};
        const transformedProfile: UserProfile = {
          id: data.id,
          name: data.name || metadata.full_name || metadata.name || '',
          age: data.age || 18,
          bio: data.bio || '',
          headline: data.headline || '',
          jobTitle: data.job_title || '',
          company: data.company || '',
          experienceLevel: data.experience_level || 'Junior',
          location: data.location || '',
          photoURL: data.photo_url || metadata.avatar_url || metadata.picture || '',
          techStack: data.tech_stack || [],
          interests: data.interests || [],
          networkingTags: data.networking_tags || [],
          college: data.college || '',
          currentWork: data.current_work || '',
          links: data.links || {},
          email: data.email || currentUser.email || '',
          gender: data.gender || '',
          onboarding_completed: isCompleted,
          onboarding_step: currentStep,
          account_status: data.account_status || 'active',
          suspended_until: data.suspended_until || null,
          suspension_reason: data.suspension_reason || null,
          ban_reason: data.ban_reason || null,
          warning_count: data.warning_count || 0,
        };

        setProfile(transformedProfile);
        setHasProfile(true);
        setOnboardingCompleted(isCompleted);
        setOnboardingStep(currentStep);

        // Cache for instant navigation & offline resiliency
        if (typeof window !== 'undefined') {
          localStorage.setItem('stackswipe_cached_profile', JSON.stringify(transformedProfile));
          localStorage.setItem('stackswipe_cached_user', JSON.stringify(enrichUser(currentUser)));
        }

        // Update last_active_at in background (fire-and-forget)
        supabase
          .from('users')
          .update({ last_active_at: new Date().toISOString() })
          .eq('id', data.id)
          .then(() => {})
          .catch(() => {});
      } else {
        setProfile(null);
        setHasProfile(false);
        setOnboardingCompleted(isCompleted);
        setOnboardingStep(currentStep);
      }
    } catch (error) {
      console.error('Error fetching Supabase user profile:', error);
      // Don't wipe cached profile on transient network glitches
      setHasProfile(false);
      setOnboardingCompleted(false);
      setOnboardingStep(0);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Immediately restore cache on client mount (runs in <1ms without hydration mismatch)
    try {
      const cachedUser = localStorage.getItem('stackswipe_cached_user');
      const cachedProfile = localStorage.getItem('stackswipe_cached_profile');
      if (cachedUser) {
        const u = JSON.parse(cachedUser);
        setUser(u);
        const cachedMatches = localStorage.getItem(`stackswipe_matches_${u.id}`);
        if (cachedMatches) setMatches(JSON.parse(cachedMatches));
      }
      if (cachedProfile) {
        const p = JSON.parse(cachedProfile);
        setProfile(p);
        setHasProfile(true);
        setOnboardingCompleted(Boolean(p.onboarding_completed));
        if (typeof p.onboarding_step === 'number') setOnboardingStep(p.onboarding_step);
      }
      if (cachedUser || cachedProfile) {
        setLoading(false);
      }
    } catch (e) {
      console.warn('Error restoring cached auth:', e);
    }

    // Get current active session
    const initAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;
        setSession(currentSession);
        setUser(enrichUser(currentSession?.user ?? null));

        if (currentSession?.user) {
          await loadUserProfile(currentSession.user);
        } else {
          setProfile(null);
          setHasProfile(false);
          setOnboardingCompleted(false);
          setOnboardingStep(0);
          setMatches([]);
        }
      } catch (err) {
        console.error('Error during initial auth session check:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initAuth();

    // Listen to Supabase auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(enrichUser(newSession?.user ?? null));

      if (newSession?.user) {
        await loadUserProfile(newSession.user);
      } else {
        setProfile(null);
        setHasProfile(false);
        setOnboardingCompleted(false);
        setOnboardingStep(0);
        setMatches([]);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Load matches when user and profile are ready
  const loadMatches = useCallback(async () => {
    if (!user) {
      setMatches([]);
      return;
    }

    try {
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('*')
        .contains('user_ids', [user.id]);

      if (error || !matchesData) {
        if (error) console.error('Error loading matches:', error);
        return;
      }

      // Single batch fetch for all other matched users
      const otherUserIds = Array.from(
        new Set(
          matchesData.flatMap((match) =>
            (match.user_ids || []).filter((id: string) => id !== user.id)
          )
        )
      );

      const userMap = new Map<string, any>();

      if (otherUserIds.length > 0) {
        const { data: otherUsersData } = await supabase
          .from('users')
          .select('*')
          .in('id', otherUserIds);

        (otherUsersData || []).forEach((u) => userMap.set(u.id, u));
      }

      // Group raw matches by otherUserId to guarantee both users share the same canonical match
      const matchesByOtherUser = new Map<string, any[]>();
      for (const m of matchesData) {
        const otherId = (m.user_ids || []).find((id: string) => id !== user.id);
        if (otherId) {
          const list = matchesByOtherUser.get(otherId) || [];
          list.push(m);
          matchesByOtherUser.set(otherId, list);
        }
      }

      const transformedMatches: Match[] = [];

      for (const [otherUserId, rawMatches] of matchesByOtherUser.entries()) {
        const otherUserData = userMap.get(otherUserId);
        // Sort ascending by created_at to use the earliest row as canonical match
        rawMatches.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
        const primaryMatch = rawMatches[0];
        const allMatchIds = rawMatches.map((m) => m.id);

        const otherUserProfile: UserProfile = otherUserData
          ? {
              id: otherUserData.id,
              name: otherUserData.name || 'Developer',
              age: otherUserData.age || 21,
              bio: otherUserData.bio || '',
              headline: otherUserData.headline || '',
              jobTitle: otherUserData.job_title || 'Software Engineer',
              company: otherUserData.company || '',
              experienceLevel: otherUserData.experience_level || 'Junior',
              location: otherUserData.location || '',
              photoURL: otherUserData.photo_url || '',
              techStack: otherUserData.tech_stack || [],
              interests: otherUserData.interests || [],
              networkingTags: otherUserData.networking_tags || [],
              college: otherUserData.college || '',
              currentWork: otherUserData.current_work || '',
              links: otherUserData.links || {},
              email: otherUserData.email || '',
              gender: otherUserData.gender || '',
              onboarding_completed: Boolean(otherUserData.onboarding_completed),
              onboarding_step: otherUserData.onboarding_step || 0,
            }
          : {
              id: otherUserId,
              name: 'Developer Match',
              age: 21,
              bio: 'Matched developer on StackSwipe',
              headline: 'Software Engineer',
              jobTitle: 'Developer',
              company: '',
              experienceLevel: 'Junior',
              location: '',
              photoURL: '',
              techStack: [],
              interests: [],
              networkingTags: [],
              college: '',
              currentWork: '',
              links: {},
              email: '',
              gender: '',
              onboarding_completed: true,
              onboarding_step: 4,
            };

        transformedMatches.push({
          id: primaryMatch.id,
          userIds: [user.id, otherUserId],
          matchIds: allMatchIds,
          users: [
            {
              ...(profile || {}),
              id: user.id,
              name: profile?.name || user.displayName || 'You',
            } as UserProfile,
            otherUserProfile,
          ],
          createdAt: primaryMatch.created_at,
        });
      }

      setMatches(transformedMatches);

      if (typeof window !== 'undefined') {
        localStorage.setItem(`stackswipe_matches_${user.id}`, JSON.stringify(transformedMatches));
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    }
  }, [user, profile]);

  useEffect(() => {
    loadMatches();

    if (!user) return;

    // Real-time subscription so new matches immediately appear for BOTH users without reloading
    const channel = supabase
      .channel(`realtime_matches_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
        },
        () => {
          loadMatches();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, loadMatches]);

  const login = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });
    if (error) throw error;
    return data;
  };

  const signup = async (email: string, pass: string) => {
    setHasProfile(false);
    setOnboardingCompleted(false);
    setOnboardingStep(0);
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });
    if (error) throw error;
    return data;
  };

  const loginWithGoogle = async () => {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
    if (error) throw error;
    return data;
  };

  const loginWithGithub = async () => {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
      },
    });
    if (error) throw error;
    return data;
  };

  const updateProfile = async (newProfile: UserProfile) => {
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      const metadata: any = user.user_metadata || {};
      const isCompleted =
        newProfile.onboarding_completed !== undefined
          ? Boolean(newProfile.onboarding_completed)
          : (profile?.onboarding_completed ?? onboardingCompleted);

      const currentStep =
        typeof newProfile.onboarding_step === 'number'
          ? newProfile.onboarding_step
          : (profile?.onboarding_step ?? onboardingStep);

      const profileData: any = {
        id: user.id,
        firebase_uid: user.id, // For backwards compatibility with existing table columns
        email: user.email || newProfile.email || 'no-email@example.com',
        name: newProfile.name || metadata.full_name || metadata.name || 'Unknown User',
        age: newProfile.age || 18,
        bio: newProfile.bio || '',
        headline: newProfile.headline || '',
        job_title: newProfile.jobTitle || '',
        company: newProfile.company || '',
        experience_level: newProfile.experienceLevel || '',
        location: newProfile.location || '',
        photo_url: newProfile.photoURL || metadata.avatar_url || metadata.picture || '',
        tech_stack: newProfile.techStack || [],
        interests: newProfile.interests || [],
        networking_tags: newProfile.networkingTags || [],
        college: newProfile.college || '',
        current_work: newProfile.currentWork || '',
        links: newProfile.links || {},
        gender: newProfile.gender || '',
        onboarding_completed: isCompleted,
        onboarding_step: currentStep,
      };

      const transformedProfile: UserProfile = {
        id: user.id,
        name: profileData.name,
        age: profileData.age,
        bio: profileData.bio,
        headline: profileData.headline,
        jobTitle: profileData.job_title,
        company: profileData.company,
        experienceLevel: profileData.experience_level,
        location: profileData.location,
        photoURL: profileData.photo_url,
        techStack: profileData.tech_stack,
        interests: profileData.interests,
        networkingTags: profileData.networking_tags,
        college: profileData.college,
        currentWork: profileData.current_work,
        links: profileData.links,
        email: profileData.email,
        gender: profileData.gender,
        onboarding_completed: isCompleted,
        onboarding_step: currentStep,
      };

      // 1. Immediately update in-memory React state so the UI never waits
      setProfile(transformedProfile);
      setHasProfile(true);
      setOnboardingCompleted(isCompleted);
      setOnboardingStep(currentStep);

      // 2. Immediately cache in localStorage for instant persistence across reloads/logins
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `stackswipe_onboarding_${user.id}`,
          JSON.stringify({
            onboarding_completed: isCompleted,
            onboarding_step: currentStep,
          })
        );
        localStorage.setItem('stackswipe_cached_profile', JSON.stringify(transformedProfile));
      }

      // 3. Persist to Supabase in a non-hanging, timeout-guarded background operation
      try {
        const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
          setTimeout(() => resolve({ timeout: true }), 3500)
        );

        const dbOperation = (async () => {
          let { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .or(`id.eq.${user.id},firebase_uid.eq.${user.id}`)
            .maybeSingle();

          let result;
          if (existingUser) {
            result = await supabase
              .from('users')
              .update(profileData)
              .eq('id', existingUser.id)
              .select()
              .maybeSingle();
          } else {
            result = await supabase.from('users').insert(profileData).select().maybeSingle();
          }

          if (
            result?.error &&
            (result.error.message?.includes('onboarding_completed') ||
              result.error.message?.includes('onboarding_step') ||
              result.error.message?.includes('check constraint'))
          ) {
            const fallbackData = { ...profileData };
            delete fallbackData.onboarding_completed;
            delete fallbackData.onboarding_step;
            if (existingUser) {
              await supabase.from('users').update(fallbackData).eq('id', existingUser.id);
            } else {
              await supabase.from('users').insert(fallbackData);
            }
          }
        })();

        await Promise.race([dbOperation, timeoutPromise]);
      } catch (dbErr) {
        console.warn('Background Supabase profile sync notice:', dbErr);
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      throw error;
    }
  };

  const saveOnboardingProgress = async (step: number, stepData: Partial<UserProfile>) => {
    if (!user) return;
    try {
      setOnboardingStep(step);

      // Merge current inputs with existing profile
      const draftProfile: UserProfile = {
        ...(profile || {
          id: user.id,
          name: '',
          headline: '',
          bio: '',
          currentWork: '',
          location: '',
          age: 18,
          experienceLevel: 'Junior',
          company: '',
          college: '',
          techStack: [],
          interests: [],
          networkingTags: [],
          links: { github: '', linkedin: '' },
        }),
        ...stepData,
        onboarding_completed: false,
        onboarding_step: step,
      };

      // Persist in localStorage draft immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          `stackswipe_onboarding_draft_${user.id}`,
          JSON.stringify({
            step,
            data: draftProfile,
          })
        );
      }

      // Persist to Supabase in the background without throwing or blocking
      updateProfile(draftProfile).catch((e) => {
        console.warn('Could not save intermediate onboarding step to database:', e);
      });
    } catch (e) {
      console.warn('saveOnboardingProgress error:', e);
    }
  };

  const logout = async () => {
    try {
      // 1. Clear all local storage caches for user, profile, matches, drafts
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('stackswipe_') || key.startsWith('sb-'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      }

      // 2. Clear all local context state
      setUser(null);
      setSession(null);
      setProfile(null);
      setHasProfile(false);
      setOnboardingCompleted(false);
      setOnboardingStep(0);
      setMatches([]);

      // 3. Sign out from Supabase (non-blocking catch)
      await supabase.auth.signOut().catch((e) => console.warn('Supabase signout notice:', e));
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // 4. Force clean hard navigation to /login to flush in-memory state
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      } else {
        router.replace('/login');
      }
    }
  };

  const value = {
    user,
    session,
    loading,
    profile,
    hasProfile,
    onboardingCompleted,
    onboardingStep,
    matches,
    setMatches,
    refreshMatches: loadMatches,
    updateProfile,
    saveOnboardingProgress,
    login,
    signup,
    loginWithGoogle,
    loginWithGithub,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
