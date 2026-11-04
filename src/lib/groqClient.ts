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

const SYSTEM_PROMPT =
  'You are StackBot, a helpful, friendly, and concise tech and career networking assistant for StackSwipe. Assist users with software engineering questions, learning paths, tech stack recommendations, and networking.';

const GEMINI_MODEL = 'gemini-2.5-flash';

// Backup provider: Groq's edge intermittently answers 403 "Access denied" for
// some networks, regardless of key or model.
async function geminiChat(message: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error('GEMINI_API_KEY is not set');

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: message }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 800,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!res.ok) {
    throw new Error(`Gemini request failed with status ${res.status}`);
  }

  const data = await res.json();
  const reply = (data.candidates?.[0]?.content?.parts ?? [])
    .map((part: { text?: string }) => part.text ?? '')
    .join('');
  if (!reply) throw new Error('Gemini returned an empty response');
  return reply;
}

export async function groqChat(message: string): Promise<string> {
  let lastError: any = null;

  for (const model of CANDIDATE_MODELS) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
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

  try {
    return await geminiChat(message);
  } catch (err: any) {
    console.warn('Gemini fallback failed:', err?.message || err);
  }

  throw lastError || new Error('No chat model responded successfully.');
}
