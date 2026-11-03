// src/lib/groqClient.ts
import Groq from 'groq-sdk';

const apiKey = process.env.GROQ_STACKBOT_API_KEY || process.env.GROQ_API_KEY;

export const groq = new Groq({
  apiKey,
});

// Candidate models verified to be available and working on your Groq key
const CANDIDATE_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.8-27b',
];

export async function groqChat(message: string): Promise<string> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content:
              'You are StackBot, a helpful, friendly, and concise tech and career networking assistant for StackSwipe. Assist users with software engineering questions, learning paths, tech stack recommendations, and networking.',
          },
          { role: 'user', content: message },
        ],
        temperature: 0.7,
        max_tokens: 800,
      });

      const reply = completion.choices[0]?.message?.content;
      if (reply) return reply;
    } catch (err: any) {
      console.warn(`Groq model ${model} failed, attempting fallback:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('No Groq chat model responded successfully.');
}
