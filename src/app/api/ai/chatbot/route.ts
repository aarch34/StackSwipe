import { NextResponse } from 'next/server';
import { groqChat } from '@/lib/groqClient';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { message?: string };

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Missing message' },
        { status: 400 }
      );
    }

    const responseText = await groqChat(body.message);

    return NextResponse.json(
      { message: responseText },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Chatbot route error:', err);
    return NextResponse.json(
      {
        error:
          err?.message ||
          err?.toString?.() ||
          'Failed to get chat response (check Groq API key/config)',
      },
      { status: 500 }
    );
  }
}
