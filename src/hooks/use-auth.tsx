'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { profileFromRow, type UserProfile, type Match } from '@/lib/data';

// Dropped and retried if the guidance_platform.sql migration has not been applied yet.
const GUIDANCE_COLUMNS = [
  'can_help_with',
  'currently_learning',
  'guidance_wanted',
  'conversation_preferences',
  'industry',
];

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

// Set before an OAuth redirect, because OAuth returns to /dashboard rather than the login form.
const OAUTH_ADMIN_CHECK_KEY = 'stackswipe_oauth_admin_check';

export async function checkIsAdmin(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

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
          canHelpWith: data.can_help_with || [],
          currentlyLearning: data.currently_learning || [],
          guidanceWanted: data.guidance_wanted || [],
          conversationPreferences: data.conversation_preferences || [],
          industry: data.industry || '',
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
          .then(() => {}, () => {});
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
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(enrichUser(newSession?.user ?? null));

      // Supabase warns that awaiting its calls inside this callback can deadlock
      // the auth lock, so the profile load runs after the callback has returned.
      setTimeout(async () => {
        if (!isMounted) return;
        if (newSession?.user) {
          await loadUserProfile(newSession.user);
        } else {
          setProfile(null);
          setHasProfile(false);
          setOnboardingCompleted(false);
          setOnboardingStep(0);
          setMatches([]);
        }
        if (isMounted) setLoading(false);
      }, 0);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // After an OAuth login, send admins to the admin panel
  useEffect(() => {
    if (!session || !sessionStorage.getItem(OAUTH_ADMIN_CHECK_KEY)) return;
    sessionStorage.removeItem(OAUTH_ADMIN_CHECK_KEY);
    checkIsAdmin(session.access_token).then((isAdmin) => {
      if (isAdmin) router.replace('/super-admin');
    });
  }, [session, router]);

  // Load matches when user and profile are ready
  const loadMatches = useCallback(async () => {
    if (!user) {
      setMatches([]);
      return;
    }

    try {
      const { data: matchesData, error, status } = await supabase
        .from('matches')
        .select('*')
        .contains('user_ids', [user.id]);

      if (error || !matchesData) {
        if (error) {
          // Logged as text because the Next.js dev overlay prints plain objects as {}.
          const reason = `Could not load matches: ${error.message}${error.code ? ` (${error.code})` : ''}`;
          // Status 0 means the request never finished, such as a network drop or leaving the
          // page. The matches already on screen are kept, so this is not an app error.
          if (status === 0) console.warn(reason);
          else console.error(reason);
        }
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
          .from('user_profiles')
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

        const otherUserProfile: UserProfile = profileFromRow(otherUserData ?? { id: otherUserId });
        if (!otherUserProfile.name) otherUserProfile.name = 'StackSwipe member';

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

      // Only a speed-up for the next visit, so a full browser storage must not count as a failure.
      try {
        localStorage.setItem(`stackswipe_matches_${user.id}`, JSON.stringify(transformedMatches));
      } catch (storageError) {
        console.warn('Could not cache matches in this browser:', storageError);
      }
    } catch (error) {
      console.error(`Could not load matches: ${error instanceof Error ? error.message : String(error)}`);
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
      options: {
        // Where the confirmation email's link lands. This URL must be on the Redirect URLs
        // list in Supabase, or the link falls back to the project's Site URL.
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/onboarding` : undefined,
      },
    });
    if (error) throw error;
    return data;
  };

  const loginWithGoogle = async () => {
    const redirectTo =
      typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : undefined;
    sessionStorage.setItem(OAUTH_ADMIN_CHECK_KEY, '1');
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
    sessionStorage.setItem(OAUTH_ADMIN_CHECK_KEY, '1');
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

    const previousProfile = profile;
    const previousCompleted = onboardingCompleted;
    const previousStep = onboardingStep;
    const rollback = () => {
      setProfile(previousProfile);
      setHasProfile(Boolean(previousProfile));
      setOnboardingCompleted(previousCompleted);
      setOnboardingStep(previousStep);
      localStorage.setItem(
        `stackswipe_onboarding_${user.id}`,
        JSON.stringify({ onboarding_completed: previousCompleted, onboarding_step: previousStep })
      );
      if (previousProfile) {
        localStorage.setItem('stackswipe_cached_profile', JSON.stringify(previousProfile));
      } else {
        localStorage.removeItem('stackswipe_cached_profile');
      }
    };

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
        can_help_with: (newProfile.canHelpWith || []).filter(Boolean),
        currently_learning: (newProfile.currentlyLearning || []).filter(Boolean),
        guidance_wanted: (newProfile.guidanceWanted || []).filter(Boolean),
        conversation_preferences: (newProfile.conversationPreferences || []).filter(Boolean),
        industry: newProfile.industry || '',
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
        canHelpWith: profileData.can_help_with,
        currentlyLearning: profileData.currently_learning,
        guidanceWanted: profileData.guidance_wanted,
        conversationPreferences: profileData.conversation_preferences,
        industry: profileData.industry,
        college: profileData.college,
        currentWork: profileData.current_work,
        links: profileData.links,
        email: profileData.email,
        gender: profileData.gender,
        onboarding_completed: isCompleted,
        onboarding_step: currentStep,
        account_status: profile?.account_status,
        suspended_until: profile?.suspended_until,
        suspension_reason: profile?.suspension_reason,
        ban_reason: profile?.ban_reason,
        warning_count: profile?.warning_count,
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

      // 3. Persist to Supabase. Waits briefly so slow networks never hang the UI, but a
      // save that fails, even after the wait, undoes the optimistic update above.
      const persist = async () => {
        const { data: existingUser, error: lookupError } = await supabase
          .from('users')
          .select('id')
          .or(`id.eq.${user.id},firebase_uid.eq.${user.id}`)
          .maybeSingle();

        if (lookupError) throw lookupError;

        const write = (payload: any) =>
          existingUser
            ? supabase.from('users').update(payload).eq('id', existingUser.id).select().maybeSingle()
            : supabase.from('users').insert(payload).select().maybeSingle();

        let payload = { ...profileData };
        let result = await write(payload);

        // These retries keep profiles saving if the database migrations are not applied yet.
        const missingGuidanceColumn =
          (result.error?.code === 'PGRST204' || result.error?.code === '42703') &&
          GUIDANCE_COLUMNS.some((column) => result.error?.message?.includes(column));

        if (missingGuidanceColumn) {
          GUIDANCE_COLUMNS.forEach((column) => delete payload[column]);
          result = await write(payload);
        }

        if (result.error?.message?.includes('experience_level')) {
          console.warn('Experience level rejected by the database. Run supabase/guidance_platform.sql.');
          payload = { ...payload, experience_level: '' };
          result = await write(payload);
        }

        if (result.error) throw result.error;
        if (!result.data) throw new Error('The profile was not saved.');
      };

      const saving = persist();
      const finished = await Promise.race([
        saving.then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 3500)),
      ]);

      if (!finished) {
        saving.catch((error) => {
          console.error('Profile save failed after the wait:', error);
          rollback();
        });
      }
    } catch (error) {
      console.error('Profile update failed:', error);
      rollback();
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
