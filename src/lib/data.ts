
import { Timestamp } from "firebase/firestore";

export type UserProfile = {
  id: string;
  name: string;
  headline: string;
  bio: string;
  currentWork: string;
  location: string;
  age: number;
  gender: string;
  experienceLevel: 'Intern' | 'Junior' | 'Mid-level' | 'Senior' | 'Lead' | 'Manager' | '';
  company: string;
  college: string;
  photoURL?: string;
  techStack: string[];
  interests: string[];
  networkingTags: string[];
  links: {
    github: string;
    linkedin: string;
  };
};

export type Message = {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
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
    matchedAt: Timestamp;
    users?: UserProfile[];
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
