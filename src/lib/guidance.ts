// Shared vocabulary for what people can share, what they are learning and how they like to talk.

export const CAN_HELP_OPTIONS = [
  'Python',
  'Web development',
  'UI/UX',
  'Product management',
  'Interview preparation',
  'Resume reviews',
  'College applications',
  'Career guidance',
  'Entrepreneurship',
  'Public speaking',
  'Getting started with coding',
  'Building projects',
];

export const LEARNING_OPTIONS = [
  'Machine learning',
  'React',
  'System design',
  'Data analytics',
  'Product management',
  'Starting a business',
  'Python',
  'Web development',
];

export const GUIDANCE_OPTIONS = [
  'Help getting started with coding',
  'Finding my first internship',
  'Preparing for technical interviews',
  'Choosing a career path',
  'Building my portfolio',
  'Understanding the industry',
  "Learning from someone's experience",
];

export const HELPING_BEGINNERS = 'Open to helping beginners';
export const LOOKING_FOR_GUIDANCE = 'Looking for guidance';
export const EXCHANGING_KNOWLEDGE = 'Happy to exchange knowledge';
export const PEER_LEARNING = 'Interested in peer learning';
export const CASUAL_CONVERSATIONS = 'Open to casual professional conversations';

export const CONVERSATION_PREFERENCES = [
  HELPING_BEGINNERS,
  LOOKING_FOR_GUIDANCE,
  EXCHANGING_KNOWLEDGE,
  PEER_LEARNING,
  CASUAL_CONVERSATIONS,
];

export const EXPERIENCE_LEVELS = [
  { value: 'Just getting started', label: 'Just getting started' },
  { value: 'Student', label: 'Student / Self-Taught' },
  { value: 'Intern', label: 'Intern' },
  { value: 'Junior', label: 'Junior (0-2 yrs)' },
  { value: 'Mid-level', label: 'Mid-level (2-5 yrs)' },
  { value: 'Senior', label: 'Senior (5-8 yrs)' },
  { value: 'Lead', label: 'Lead / Staff (8+ yrs)' },
  { value: 'Manager', label: 'Engineering Manager' },
  { value: 'Founder', label: 'Founder / Co-Founder' },
  { value: 'Freelancer', label: 'Freelancer / Consultant' },
];

export const COMMUNITY_PRINCIPLES = [
  'No question is too basic.',
  'Everyone starts somewhere.',
  'Share knowledge generously.',
  "Respect everyone's learning journey.",
  'Be approachable and kind.',
  'Help without expecting something in return.',
  'Everyone is both a learner and a contributor.',
];

export const ICEBREAKER_CATEGORIES = [
  { id: 'guidance', label: 'Ask for guidance', brief: 'asking the other person for guidance on something they know about' },
  { id: 'offer-help', label: 'Offer help', brief: 'offering to help with something the other person is learning or wants guidance on' },
  { id: 'shared-interests', label: 'Shared interests', brief: 'something both people are interested in' },
  { id: 'career', label: 'Career advice', brief: 'career paths, decisions and lessons learned' },
  { id: 'learning-together', label: 'Learning together', brief: 'learning something together or comparing notes on learning' },
  { id: 'casual', label: 'Casual conversation', brief: 'a relaxed, friendly chat with no agenda' },
  { id: 'technical', label: 'Technical discussions', brief: 'a specific technical topic that fits their profiles' },
  { id: 'interviews', label: 'Interview preparation', brief: 'preparing for interviews' },
  { id: 'projects', label: 'Project ideas', brief: 'project ideas, things to build and how to get started' },
] as const;

export type IcebreakerCategoryId = (typeof ICEBREAKER_CATEGORIES)[number]['id'];

export const QUICK_START_MESSAGES = [
  "Hey! I'd love to learn more about your journey.",
  "I'm currently learning something you have experience with. Could I ask you a question?",
  'I noticed we share similar interests. What are you working on currently?',
  'Is there something you wish you had known when you started?',
];
