import { NextRequest, NextResponse } from 'next/server';
import { generateConversationStarters } from '@/lib/ai-service';

export async function POST(request: NextRequest) {
  try {
    const { currentUser, otherUser, conversationType } = await request.json();

    if (!currentUser || !otherUser) {
      return NextResponse.json(
        { error: 'Missing user profiles' },
        { status: 400 }
      );
    }

    const suggestions = await generateConversationStarters({
      currentUser,
      otherUser,
      conversationType: conversationType || 'first_message'
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error in conversation starters API:', error);
    return NextResponse.json(
      { error: 'Failed to generate conversation starters' },
      { status: 500 }
    );
  }
}
