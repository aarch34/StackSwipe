import { NextRequest, NextResponse } from 'next/server';
import { groqChat } from '@/lib/groqClient';
import { consumeAiQuota, requireActiveUser } from '@/lib/user-auth';

const DAILY_LIMIT = 50;
const MAX_MESSAGE_CHARS = 4000;

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveUser(request);
    if (session instanceof NextResponse) return session;

    const body = (await request.json()) as { message?: string };

    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'Missing message' },
        { status: 400 }
      );
    }

    if (body.message.length > MAX_MESSAGE_CHARS) {
      return NextResponse.json(
        { error: `Please keep your message under ${MAX_MESSAGE_CHARS} characters.` },
        { status: 400 }
      );
    }

    const blocked = await consumeAiQuota(session, 'chatbot', DAILY_LIMIT);
    if (blocked) return blocked;

    const responseText = await groqChat(body.message);

    return NextResponse.json(
      { message: responseText },
      { status: 200 }
    );
  } catch (err: any) {
    console.error('Chatbot route error:', err);
    return NextResponse.json(
      { error: 'StackBot is temporarily unavailable. Please try again in a moment.' },
      { status: 502 }
    );
  }
}
