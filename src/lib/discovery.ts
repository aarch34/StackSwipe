import type { UserProfile } from './data';
import { EXCHANGING_KNOWLEDGE, HELPING_BEGINNERS, PEER_LEARNING } from './guidance';

export type ConnectionIntent =
  | 'guide-me'
  | 'i-can-help'
  | 'learning-similar'
  | 'career-similar'
  | 'exchange';

export const CONNECTION_INTENTS: { id: ConnectionIntent; label: string }[] = [
  { id: 'guide-me', label: 'People who can guide me' },
  { id: 'i-can-help', label: 'People I can help' },
  { id: 'learning-similar', label: 'People learning similar things' },
  { id: 'career-similar', label: 'People with similar career interests' },
  { id: 'exchange', label: 'People open to exchanging knowledge' },
];

export interface DiscoveryFilters {
  location: string;
  company: string;
  college: string;
  role: string;
  industry: string;
  experienceLevel: string;
  canHelpWith: string;
  learning: string;
  guidanceWanted: string;
  networkingGoals: string[];
  intents: ConnectionIntent[];
}

export const EMPTY_FILTERS: DiscoveryFilters = {
  location: '',
  company: '',
  college: '',
  role: '',
  industry: '',
  experienceLevel: '',
  canHelpWith: '',
  learning: '',
  guidanceWanted: '',
  networkingGoals: [],
  intents: [],
};

export interface DiscoveryLabel {
  id: string;
  text: string;
  detail?: string;
}

// Guidance goals are phrased as sentences, so link them to the topics that can answer them.
const RELATED_TOPICS: Record<string, string[]> = {
  'help getting started with coding': ['getting started with coding', 'python', 'web development', 'building projects'],
  'finding my first internship': ['career guidance', 'resume reviews', 'interview preparation'],
  'preparing for technical interviews': ['interview preparation'],
  'choosing a career path': ['career guidance'],
  'building my portfolio': ['building projects', 'resume reviews', 'web development'],
  'understanding the industry': ['career guidance'],
  "learning from someone's experience": ['career guidance'],
};

const normalize = (topic: string) =>
  topic.toLowerCase().replace(/[^a-z0-9+#.']+/g, ' ').trim();

const containsPhrase = (text: string, phrase: string) =>
  phrase.length >= 2 && ` ${text} `.includes(` ${phrase} `);

export function sameTopic(a: string, b: string): boolean {
  const left = normalize(a);
  const right = normalize(b);
  if (!left || !right) return false;
  return left === right || containsPhrase(left, right) || containsPhrase(right, left);
}

const expand = (topics: string[]) =>
  topics.flatMap((topic) => [topic, ...(RELATED_TOPICS[normalize(topic)] ?? [])]);

/** The entries of `offered` that answer something in `wanted`. */
export function sharedTopics(offered: string[] = [], wanted: string[] = []): string[] {
  const needs = expand(wanted);
  return offered.filter((topic) => needs.some((need) => sameTopic(topic, need)));
}

const whatTheyWant = (p: UserProfile) => [...(p.currentlyLearning ?? []), ...(p.guidanceWanted ?? [])];

const listOf = (topics: string[]) => topics.slice(0, 2).join(' and ');

/** Labels built only from what both people actually put on their profiles. */
export function getDiscoveryLabels(me: UserProfile | null | undefined, them: UserProfile): DiscoveryLabel[] {
  const labels: DiscoveryLabel[] = [];
  const preferences = them.conversationPreferences ?? [];

  if (me) {
    const canHelpMe = sharedTopics(them.canHelpWith, whatTheyWant(me));
    if (canHelpMe.length) {
      labels.push({ id: 'can-help-you', text: 'Can help you get started', detail: listOf(canHelpMe) });
    }

    const learningTogether = sharedTopics(them.currentlyLearning, me.currentlyLearning);
    if (learningTogether.length) {
      labels.push({ id: 'same-learning', text: 'Learning the same things as you', detail: listOf(learningTogether) });
    }

    const iCanHelp = sharedTopics(me.canHelpWith, whatTheyWant(them));
    if (iCanHelp.length) {
      labels.push({ id: 'you-can-help', text: 'You could help them', detail: listOf(iCanHelp) });
    }

    const careerOverlap = sharedTopics(them.interests, me.interests);
    if (careerOverlap.length) {
      labels.push({ id: 'similar-career', text: 'Similar career interests', detail: listOf(careerOverlap) });
    }

    const experienced = sharedTopics(them.techStack, [...(me.interests ?? []), ...whatTheyWant(me)]);
    if (experienced.length) {
      labels.push({ id: 'has-experience', text: 'Has experience in your area of interest', detail: listOf(experienced) });
    }
  }

  if (preferences.includes(HELPING_BEGINNERS)) {
    labels.push({ id: 'helps-beginners', text: HELPING_BEGINNERS });
  }

  return labels;
}

/** Higher scores surface first. People with nothing in common keep their existing order. */
export function relevanceScore(me: UserProfile | null | undefined, them: UserProfile): number {
  const weights: Record<string, number> = {
    'can-help-you': 5,
    'same-learning': 4,
    'you-can-help': 3,
    'similar-career': 2,
    'has-experience': 2,
    'helps-beginners': 1,
  };
  return getDiscoveryLabels(me, them).reduce((total, label) => total + (weights[label.id] ?? 0), 0);
}

function matchesIntent(intent: ConnectionIntent, me: UserProfile | null | undefined, them: UserProfile): boolean {
  const preferences = them.conversationPreferences ?? [];

  switch (intent) {
    case 'guide-me': {
      const wanted = me ? whatTheyWant(me) : [];
      if (!wanted.length) return (them.canHelpWith?.length ?? 0) > 0 || preferences.includes(HELPING_BEGINNERS);
      return sharedTopics(them.canHelpWith, wanted).length > 0;
    }
    case 'i-can-help':
      return sharedTopics([...(me?.canHelpWith ?? []), ...(me?.techStack ?? [])], whatTheyWant(them)).length > 0;
    case 'learning-similar':
      return sharedTopics(them.currentlyLearning, me?.currentlyLearning).length > 0;
    case 'career-similar':
      return (
        sharedTopics(them.interests, me?.interests).length > 0 ||
        sharedTopics(them.guidanceWanted, me?.guidanceWanted).length > 0 ||
        Boolean(me?.industry && them.industry && sameTopic(me.industry, them.industry))
      );
    case 'exchange':
      return preferences.includes(EXCHANGING_KNOWLEDGE) || preferences.includes(PEER_LEARNING);
  }
}

const includesText = (value: string | undefined, query: string) =>
  !query.trim() || (value ?? '').toLowerCase().includes(query.trim().toLowerCase());

const hasAnyTopic = (topics: string[] | undefined, query: string) => {
  const wanted = query.split(',').map((topic) => topic.trim()).filter(Boolean);
  return !wanted.length || wanted.some((want) => (topics ?? []).some((topic) => sameTopic(topic, want)));
};

/** Every filter group must match. Choosing several intents or goals matches any of them. */
export function applyDiscoveryFilters(
  profiles: UserProfile[],
  filters: DiscoveryFilters,
  me?: UserProfile | null
): UserProfile[] {
  return profiles.filter((them) => {
    const role = `${them.jobTitle ?? ''} ${them.currentWork ?? ''} ${them.headline ?? ''}`;
    const experience = filters.experienceLevel === 'any' ? '' : filters.experienceLevel;

    return (
      includesText(them.location, filters.location) &&
      includesText(them.company, filters.company) &&
      includesText(them.college, filters.college) &&
      includesText(role, filters.role) &&
      includesText(them.industry, filters.industry) &&
      includesText(them.experienceLevel, experience) &&
      hasAnyTopic([...(them.canHelpWith ?? []), ...(them.techStack ?? [])], filters.canHelpWith) &&
      hasAnyTopic(them.currentlyLearning, filters.learning) &&
      hasAnyTopic(them.guidanceWanted, filters.guidanceWanted) &&
      (!filters.networkingGoals.length ||
        (them.networkingTags ?? []).some((tag) => filters.networkingGoals.some((goal) => sameTopic(tag, goal)))) &&
      (!filters.intents.length || filters.intents.some((intent) => matchesIntent(intent, me, them)))
    );
  });
}

export function countActiveFilters(filters: DiscoveryFilters): number {
  return Object.entries(filters).filter(([key, value]) => {
    if (Array.isArray(value)) return value.length > 0;
    return key === 'experienceLevel' ? Boolean(value) && value !== 'any' : Boolean(value.trim());
  }).length;
}
