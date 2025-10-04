
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
