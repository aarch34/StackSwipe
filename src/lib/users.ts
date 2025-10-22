import { supabase } from '@/lib/supabase';
import type { UserProfile } from '@/lib/data';

/**
 * Fetches all user profiles from the 'users' table in Supabase.
 * @returns A promise that resolves to an array of UserProfile objects.
 */
export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('*');
    
    if (error) {
      console.error("Error fetching users:", error);
      return [];
    }

    // Transform Supabase data to match UserProfile interface
    const userList: UserProfile[] = users?.map(user => ({
      id: user.id,
      name: user.name,
      age: user.age,
      bio: user.bio,
      headline: user.headline,
      jobTitle: user.job_title,
      company: user.company,
      experienceLevel: user.experience_level,
      location: user.location,
      photoURL: user.photo_url,
      techStack: user.tech_stack || [],
      interests: user.interests || [],
      networkingTags: user.networking_tags || [],
      college: user.college,
      currentWork: user.current_work,
      links: user.links || {},
      email: user.email,
      gender: user.gender
    })) || [];
    
    return userList;
  } catch (error) {
    console.error("Error fetching users:", error);
    return [];
  }
}
