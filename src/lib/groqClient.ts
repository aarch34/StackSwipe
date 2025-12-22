// src/lib/groqClient.ts
import Groq from 'groq-sdk';

export const groq = new Groq({
  // Map your custom env var name to what groq-sdk expects
  apiKey: process.env.GROQ_STACKBOT_API_KEY,
});

export async function groqChat(message: string) {
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', // or another Groq model
    messages: [
      {
        role: 'system',
        content:
          'You are StackSwipe Bot, a helpful, concise networking assistant.',
      },
      { role: 'user', content: message },
    ],
  });

  return completion.choices[0]?.message?.content ?? '';
}
