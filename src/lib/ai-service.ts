import Groq from "groq-sdk";
import type { UserProfile } from './data';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

interface ConversationContext {
  currentUser: UserProfile;
  otherUser: UserProfile;
  conversationType: 'first_message' | 'follow_up' | 'ice_breaker';
}

export async function generateConversationStarters(context: ConversationContext): Promise<string[]> {
  const { currentUser, otherUser, conversationType } = context;
  
  // Find common interests and complementary skills
  const commonTechStack = currentUser.techStack.filter(tech => 
    otherUser.techStack.some(otherTech => 
      otherTech.toLowerCase().includes(tech.toLowerCase()) || 
      tech.toLowerCase().includes(otherTech.toLowerCase())
    )
  );
  
  const commonInterests = currentUser.interests.filter(interest =>
    otherUser.interests.some(otherInterest =>
      otherInterest.toLowerCase().includes(interest.toLowerCase()) ||
      interest.toLowerCase().includes(otherInterest.toLowerCase())
    )
  );

  const commonNetworkingGoals = currentUser.networkingTags.filter(goal =>
    otherUser.networkingTags.includes(goal)
  );

  const prompt = `You are an AI assistant for StackSwipe, a professional networking app for tech professionals. Generate 3 personalized conversation starters for a professional networking context.

CURRENT USER PROFILE:
- Name: ${currentUser.name}
- Role: ${currentUser.jobTitle} at ${currentUser.company}
- Experience: ${currentUser.experienceLevel}
- Tech Stack: ${currentUser.techStack.join(', ')}
- Interests: ${currentUser.interests.join(', ')}
- Networking Goals: ${currentUser.networkingTags.join(', ')}
- College: ${currentUser.college || 'Not specified'}
- Bio: ${currentUser.bio}

OTHER USER PROFILE:
- Name: ${otherUser.name}
- Role: ${otherUser.jobTitle} at ${otherUser.company}
- Experience: ${otherUser.experienceLevel}
- Tech Stack: ${otherUser.techStack.join(', ')}
- Interests: ${otherUser.interests.join(', ')}
- Networking Goals: ${otherUser.networkingTags.join(', ')}
- College: ${otherUser.college || 'Not specified'}
- Bio: ${otherUser.bio}

CONVERSATION CONTEXT:
- Type: ${conversationType}
- Common Tech Stack: ${commonTechStack.join(', ') || 'None'}
- Common Interests: ${commonInterests.join(', ') || 'None'}
- Common Networking Goals: ${commonNetworkingGoals.join(', ') || 'None'}

REQUIREMENTS:
1. Generate exactly 3 conversation starters
2. Keep messages professional but friendly
3. Personalize based on profiles and common ground
4. Make them 1-2 sentences long
5. Focus on networking, collaboration, or knowledge sharing
6. Avoid generic messages like "How are you?"
7. Use specific details from their profiles

EXAMPLES OF GOOD STARTERS:
- "Hi Alice! I noticed you work with React at TechCorp. I'm curious about your experience with Next.js - we're considering it for our e-commerce platform at MyCompany."
- "Hey Bob! Saw you're also interested in AI/ML. Have you tried the new Claude API? I'd love to hear your thoughts on it!"
- "Hi Carol! Fellow mid-level developer here! I'm working on a React project and noticed you have experience with TypeScript. Would love to connect!"

Return only the 3 conversation starters, one per line, without numbering or bullets.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.1-70b-versatile", // Fast and smart Llama model
      temperature: 0.7,
      max_tokens: 300,
    });

    const suggestions = chatCompletion.choices[0]?.message?.content
      ?.split('\n')
      .filter(line => line.trim())
      .slice(0, 3) || [];

    return suggestions.length > 0 ? suggestions : generateFallbackSuggestions(context);
  } catch (error) {
    console.error('Error generating conversation starters:', error);
    return generateFallbackSuggestions(context);
  }
}

function generateFallbackSuggestions(context: ConversationContext): string[] {
  const { currentUser, otherUser } = context;
  
  const suggestions = [];
  
  // Tech stack based
  if (otherUser.techStack.length > 0) {
    suggestions.push(`Hi ${otherUser.name}! I noticed you work with ${otherUser.techStack[0]}. I'd love to hear about your experience with it!`);
  }
  
  // Company/role based
  if (otherUser.company && otherUser.jobTitle) {
    suggestions.push(`Hey ${otherUser.name}! ${otherUser.jobTitle} at ${otherUser.company} sounds interesting. What's the most exciting project you're working on?`);
  }
  
  // Interest based
  if (otherUser.interests.length > 0) {
    suggestions.push(`Hi ${otherUser.name}! Fellow ${otherUser.interests[0]} enthusiast here! Have you been to any good events recently?`);
  }
  
  // Networking goal based
  if (otherUser.networkingTags.length > 0) {
    suggestions.push(`Hi ${otherUser.name}! I see you're ${otherUser.networkingTags[0].toLowerCase()}. I'd love to connect and see how we might help each other!`);
  }
  
  // Generic but personalized fallback
  if (suggestions.length === 0) {
    suggestions.push(`Hi ${otherUser.name}! Your profile looks great. I'd love to connect and learn more about your work in tech!`);
  }
  
  return suggestions.slice(0, 3);
}

export async function generateReplyAssistance(
  messageHistory: string[],
  currentUser: UserProfile,
  otherUser: UserProfile
): Promise<string[]> {
  const recentMessages = messageHistory.slice(-8); // Last 8 messages for context
  
  const prompt = `You are an AI assistant helping with professional networking conversations. Generate 3 smart reply suggestions for this ongoing conversation.

CONVERSATION CONTEXT:
${recentMessages.join('\n')}

CURRENT USER PROFILE:
- Name: ${currentUser.name}
- Role: ${currentUser.jobTitle} at ${currentUser.company}
- Experience: ${currentUser.experienceLevel}
- Tech Stack: ${currentUser.techStack.join(', ')}
- Interests: ${currentUser.interests.join(', ')}
- Networking Goals: ${currentUser.networkingTags.join(', ')}

OTHER USER PROFILE:
- Name: ${otherUser.name}
- Role: ${otherUser.jobTitle} at ${otherUser.company}
- Experience: ${otherUser.experienceLevel}
- Tech Stack: ${otherUser.techStack.join(', ')}
- Interests: ${otherUser.interests.join(', ')}
- Networking Goals: ${otherUser.networkingTags.join(', ')}

REQUIREMENTS:
1. Generate exactly 3 reply suggestions
2. Make them contextually relevant to the conversation
3. Keep them professional but friendly
4. Vary the tone: 1 casual/short, 1 detailed/informative, 1 question-based
5. Consider both users' backgrounds for relevant responses
6. Make replies 1-2 sentences each
7. Focus on building professional relationships

EXAMPLES OF GOOD REPLIES:
- "That's really interesting! I've had a similar experience with [relevant tech/situation]."
- "Thanks for sharing that insight. Have you considered trying [relevant suggestion] for that use case?"
- "Great point about [topic]. In my experience at [company], we found [brief insight]."

Return only the 3 reply suggestions, one per line, without numbering or bullets.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant", // Faster model for quick replies
      temperature: 0.7,
      max_tokens: 200,
    });

    const suggestions = chatCompletion.choices[0]?.message?.content
      ?.split('\n')
      .filter(line => line.trim())
      .slice(0, 3) || [];

    return suggestions.length > 0 ? suggestions : [
      'Thanks for sharing that!', 
      'That sounds really interesting. Tell me more!', 
      'I\'d love to learn more about your experience with that.'
    ];
  } catch (error) {
    console.error('Error generating reply assistance:', error);
    return [
      'Thanks for sharing that!', 
      'That sounds really interesting. Tell me more!', 
      'I\'d love to learn more about your experience with that.'
    ];
  }
}

export async function generatePostSuggestion(
  title: string,
  category: string = 'general'
): Promise<string> {
  const prompt = `You are an AI assistant helping tech professionals write engaging community posts. Generate a well-structured post content based on the given title and category.

Title: "${title}"
Category: ${category}

Requirements:
1. Write 2-3 paragraphs of engaging content
2. Make it conversational and professional
3. Include relevant technical context if applicable
4. End with a question to encourage discussion
5. Focus on value for the tech community
6. Keep it concise but informative

Examples of good community posts:
- Share personal experiences and lessons learned
- Ask for advice or recommendations
- Discuss industry trends and best practices
- Share interesting projects or discoveries

Write the post content only, without any title or meta information.`;

  try {
    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 400,
    });

    const suggestion = chatCompletion.choices[0]?.message?.content?.trim() || '';
    
    return suggestion || generateFallbackPostContent(title, category);
  } catch (error) {
    console.error('Error generating post suggestion:', error);
    return generateFallbackPostContent(title, category);
  }
}

function generateFallbackPostContent(title: string, category: string): string {
  const fallbacks = {
    'ai-ml': `I've been exploring this topic and would love to hear the community's thoughts. What has been your experience with similar challenges?

From my perspective, this is an area where the industry is rapidly evolving, and I'm curious about best practices others have discovered.

What approaches have worked well for you? Any pitfalls to avoid?`,
    
    'career': `This is something I've been thinking about a lot lately in my career journey. I'd love to get some perspective from others who might have faced similar situations.

I think this is a common challenge many of us face, and sharing experiences could really help the community.

What advice would you give? How did you handle similar situations?`,
    
    'frontend': `I've been working with this technology recently and wanted to share my experience with the community. There are some interesting aspects that I think would benefit from broader discussion.

From my development work, I've noticed some patterns that might be useful for others facing similar challenges.

What has been your experience? Are there better approaches I should consider?`,
    
    'backend': `This is an area I've been diving deep into lately, and I'm curious about how others in the community approach these challenges.

In my recent projects, I've encountered some interesting technical decisions that made me think about best practices and industry standards.

What's your take on this? How do you handle similar situations in your backend work?`,
    
    'general': `I wanted to start a discussion about this topic because I think it's something many of us in the tech community encounter.

I'm interested in hearing different perspectives and experiences from the community on this.

What are your thoughts? Have you dealt with something similar?`
  };

  return fallbacks[category as keyof typeof fallbacks] || fallbacks.general;
}
