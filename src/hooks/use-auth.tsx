'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { firebaseApp } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import type { UserProfile, Match } from '@/lib/data';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    profile: UserProfile | null;
    hasProfile: boolean;
    matches: Match[]; 
    setMatches: React.Dispatch<React.SetStateAction<Match[]>>;
    updateProfile: (profile: UserProfile) => Promise<void>;
    login: (email: string, pass: string) => Promise<any>;
    signup: (email: string, pass: string) => Promise<any>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [hasProfile, setHasProfile] = useState(false);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [matches, setMatches] = useState<Match[]>([]);
    const auth = getAuth(firebaseApp);
    const router = useRouter();

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            setLoading(true);
            setUser(user);
            
            if (user) {
                try {
                    // Get user profile from Supabase
                    const { data, error } = await supabase
                        .from('users')
                        .select('*')
                        .eq('firebase_uid', user.uid)
                        .single();

                    if (data && !error) {
                        // Transform Supabase data to UserProfile
                        const transformedProfile: UserProfile = {
                            id: data.id,
                            name: data.name,
                            age: data.age,
                            bio: data.bio,
                            headline: data.headline,
                            jobTitle: data.job_title,
                            company: data.company,
                            experienceLevel: data.experience_level,
                            location: data.location,
                            photoURL: data.photo_url,
                            techStack: data.tech_stack || [],
                            interests: data.interests || [],
                            networkingTags: data.networking_tags || [],
                            college: data.college,
                            currentWork: data.current_work,
                            links: data.links || {},
                            email: data.email,
                            gender: data.gender
                        };
                        
                        setProfile(transformedProfile);
                        setHasProfile(true);
                    } else {
                        setProfile(null);
                        setHasProfile(false);
                    }
                } catch (error) {
                    console.error('Error fetching profile:', error);
                    setProfile(null);
                    setHasProfile(false);
                }
            } else {
                setHasProfile(false);
                setProfile(null);
                setMatches([]);
            }
            setLoading(false);
        });

        return () => unsubscribeAuth();
    }, [auth]);

// Load matches when user and profile are available
useEffect(() => {
    if (!user || !profile) {
        setMatches([]);
        return;
    }

    const loadMatches = async () => {
        try {
            // Get user's internal Supabase ID
            const { data: userData } = await supabase
                .from('users')
                .select('id')
                .eq('firebase_uid', user.uid)
                .single();

            if (!userData) {
                console.log('Current user not found in Supabase');
                return;
            }

            console.log('Current user Supabase ID:', userData.id);

            // Get matches where user's SUPABASE ID is involved
            const { data: matchesData, error } = await supabase
                .from('matches')
                .select('*')
                .contains('user_ids', [userData.id]);

            console.log('Raw matches from database:', matchesData);

            if (error) {
                console.error('Error loading matches:', error);
                return;
            }

            // Get user profiles for each match
            const transformedMatches: Match[] = [];
            
            for (const match of matchesData || []) {
                console.log('Processing match:', match);
                
                // Find the OTHER user's Supabase ID
                const otherUserId = match.user_ids.find((id: string) => id !== userData.id);
                console.log('Other user ID:', otherUserId);
                
                if (otherUserId) {
                    const { data: otherUserData } = await supabase
                        .from('users')
                        .select('*')
                        .eq('id', otherUserId)
                        .single();

                    console.log('Other user data:', otherUserData);

                    if (otherUserData) {
                        const otherUserProfile: UserProfile = {
                            id: otherUserData.firebase_uid, // Use Firebase UID for compatibility
                            name: otherUserData.name,
                            age: otherUserData.age,
                            bio: otherUserData.bio,
                            headline: otherUserData.headline,
                            jobTitle: otherUserData.job_title,
                            company: otherUserData.company,
                            experienceLevel: otherUserData.experience_level,
                            location: otherUserData.location,
                            photoURL: otherUserData.photo_url,
                            techStack: otherUserData.tech_stack || [],
                            interests: otherUserData.interests || [],
                            networkingTags: otherUserData.networking_tags || [],
                            college: otherUserData.college,
                            currentWork: otherUserData.current_work,
                            links: otherUserData.links || {},
                            email: otherUserData.email,
                            gender: otherUserData.gender
                        };

                        // THE KEY FIX: Include both users with proper Firebase UIDs
                        transformedMatches.push({
                            id: match.id,
                            userIds: [user.uid, otherUserData.firebase_uid], // Use Firebase UIDs here
                            users: [
                                {
                                    ...profile,
                                    id: user.uid // Make sure current user profile uses Firebase UID
                                }, 
                                otherUserProfile
                            ],
                            createdAt: match.created_at
                        });

                        console.log('Added match:', otherUserProfile.name);
                    }
                }
            }

            console.log('Final transformed matches:', transformedMatches);
            setMatches(transformedMatches);
        } catch (error) {
            console.error('Error loading matches:', error);
        }
    };

    loadMatches();
}, [user, profile]);

   

    const login = (email: string, pass: string) => {
        return signInWithEmailAndPassword(auth, email, pass);
    };

    const signup = (email: string, pass: string) => {
        setHasProfile(false);
        return createUserWithEmailAndPassword(auth, email, pass);
    };
    
    const updateProfile = async (newProfile: UserProfile) => {
        if (!user) {
            console.error('❌ No authenticated user');
            throw new Error('No authenticated user');
        }

        try {
            console.log('🚀 Starting profile update for user:', user.uid);
            console.log('📋 Profile data received:', newProfile);

            // Create the exact same structure that worked manually
            const profileData = {
                firebase_uid: user.uid,
                email: user.email || newProfile.email || 'no-email@example.com',
                name: newProfile.name || 'Unknown User',
                age: newProfile.age || 18,
                bio: newProfile.bio || '',
                headline: newProfile.headline || '',
                job_title: newProfile.jobTitle || '',
                company: newProfile.company || '',
                experience_level: newProfile.experienceLevel || '',
                location: newProfile.location || '',
                photo_url: newProfile.photoURL || '',
                tech_stack: newProfile.techStack || [],
                interests: newProfile.interests || [],
                networking_tags: newProfile.networkingTags || [],
                college: newProfile.college || '',
                current_work: newProfile.currentWork || '',
                links: newProfile.links || {},
                gender: newProfile.gender || ''
            };

            console.log('📤 Sending to Supabase:', profileData);

            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('firebase_uid', user.uid)
                .single();

            let result;
            if (existingUser) {
                // Update existing user
                console.log('🔄 Updating existing user:', existingUser.id);
                result = await supabase
                    .from('users')
                    .update(profileData)
                    .eq('firebase_uid', user.uid)
                    .select()
                    .single();
            } else {
                // Insert new user
                console.log('➕ Creating new user');
                result = await supabase
                    .from('users')
                    .insert(profileData)
                    .select()
                    .single();
            }

            const { data, error } = result;

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log('✅ Success! Profile saved:', data);

            // Transform back to UserProfile format
            const transformedProfile: UserProfile = {
                id: data.id,
                name: data.name,
                age: data.age,
                bio: data.bio,
                headline: data.headline,
                jobTitle: data.job_title,
                company: data.company,
                experienceLevel: data.experience_level,
                location: data.location,
                photoURL: data.photo_url,
                techStack: data.tech_stack || [],
                interests: data.interests || [],
                networkingTags: data.networking_tags || [],
                college: data.college,
                currentWork: data.current_work,
                links: data.links || {},
                email: data.email,
                gender: data.gender
            };

            // Update local state
            setProfile(transformedProfile);
            setHasProfile(true);

            console.log('🎉 Profile update complete!');

        } catch (error) {
            console.error('💥 Profile update failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
        setProfile(null);
        setUser(null);
        setHasProfile(false);
        setMatches([]);
        router.push('/');
    };

    const value = { user, loading, profile, hasProfile, matches, setMatches, updateProfile, login, signup, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
