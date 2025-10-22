import { NextRequest, NextResponse } from 'next/server';
import { generateReplyAssistance } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { currentUser, otherUser, messageHistory } = await request.json();

    if (!currentUser || !otherUser || !messageHistory) {
      return NextResponse.json(
        { error: 'Missing required data' },
        { status: 400 }
      );
    }

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
