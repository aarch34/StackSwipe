
export type UserProfile = {
  id: string;
  name: string;
  headline: string;
  bio: string;
  currentWork: string;
  jobTitle?: string;
  location: string;
  age: number;
  gender?: string;
  experienceLevel: string;
  company: string;
  college: string;
  photoURL?: string;
  techStack: string[];
  interests: string[];
  networkingTags: string[];
  canHelpWith?: string[];
  currentlyLearning?: string[];
  guidanceWanted?: string[];
  conversationPreferences?: string[];
  industry?: string;
  links: {
    github: string;
    linkedin: string;
  };
  email?: string;
  onboarding_completed?: boolean;
  onboarding_step?: number;
  account_status?: 'active' | 'suspended' | 'banned' | 'soft_deleted';
  suspended_until?: string | null;
  suspension_reason?: string | null;
  ban_reason?: string | null;
  warning_count?: number;
};

/** Maps a row from users, user_profiles or discoverable_profiles without inventing any values. */
export function profileFromRow(row: any): UserProfile {
  return {
    id: row.id,
    name: row.name || '',
    age: row.age,
    gender: row.gender || '',
    bio: row.bio || '',
    headline: row.headline || '',
    jobTitle: row.job_title || '',
    company: row.company || '',
    experienceLevel: row.experience_level || '',
    location: row.location || '',
    photoURL: row.photo_url || '',
    techStack: row.tech_stack || [],
    interests: row.interests || [],
    networkingTags: row.networking_tags || [],
    canHelpWith: row.can_help_with || [],
    currentlyLearning: row.currently_learning || [],
    guidanceWanted: row.guidance_wanted || [],
    conversationPreferences: row.conversation_preferences || [],
    industry: row.industry || '',
    college: row.college || '',
    currentWork: row.current_work || '',
    links: { github: row.links?.github || '', linkedin: row.links?.linkedin || '' },
    onboarding_completed: Boolean(row.onboarding_completed),
    onboarding_step: row.onboarding_step || 0,
  };
}

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date | string;
  imageUrl?: string | null;
  read?: boolean;
};

export type Conversation = {
  id: string;
  userIds: string[];
  messages: Message[];
  users: UserProfile[];
};

export type Match = {
    id: string;
    userIds: string[];
    matchedAt?: Date | string;
    createdAt?: Date | string;
    users?: UserProfile[];
    matchIds?: string[];
};

// Add these interfaces to your existing data.ts file

export interface Post {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  upvotes: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: UserProfile;
  user_vote?: 'up' | 'down' | null;
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_comment_id: string | null;
  upvotes: number;
  created_at: string;
  updated_at: string;
  // Joined data
  user?: UserProfile;
  user_vote?: 'up' | 'down' | null;
  replies?: Comment[];
}

export interface Vote {
  id: string;
  user_id: string;
  post_id?: string;
  comment_id?: string;
  vote_type: 'up' | 'down';
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  created_at: string;
}

export interface CreatePostData {
  title: string;
  content: string;
  category: string;
  tags: string[];
}

export interface CreateCommentData {
  post_id: string;
  content: string;
  parent_comment_id?: string;
}
