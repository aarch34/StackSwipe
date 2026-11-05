import { NextRequest, NextResponse } from 'next/server';
import { generateReplyAssistance } from '@/lib/ai-service';
import { consumeAiQuota, readAiRequestBody, requireActiveUser } from '@/lib/user-auth';

const DAILY_LIMIT = 50;

export async function POST(request: NextRequest) {
  try {
    const session = await requireActiveUser(request);
    if (session instanceof NextResponse) return session;

    const body = await readAiRequestBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
    }

    const { currentUser, otherUser, messageHistory } = body;

    if (!currentUser || !otherUser || !messageHistory) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

    const blocked = await consumeAiQuota(session, 'reply', DAILY_LIMIT);
    if (blocked) return blocked;

    // Convert message history to simple text array for AI processing
    const textHistory = messageHistory.map((msg: any) =>
      `${msg.isFromCurrentUser ? currentUser.name : otherUser.name}: ${msg.text}`
    );

    const suggestions = await generateReplyAssistance(
      textHistory,
      currentUser,
      otherUser
    );

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error in reply suggestions API:', error);
    return NextResponse.json(
      { error: 'Failed to generate reply suggestions' },
      { status: 500 }
    );
  }
}
