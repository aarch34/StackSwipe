import { NextRequest, NextResponse } from 'next/server';
import { generateConversationStarters } from '@/lib/ai-service';
import { consumeAiQuota, readAiRequestBody, requireActiveUser } from '@/lib/user-auth';

const DEFAULT_DAILY_LIMIT = 15;

export async function POST(request: NextRequest) {
  const session = await requireActiveUser(request);
  if (session instanceof NextResponse) return session;

  const sb = session.client;
  let otherUserProfile: any = null;
  let categoryType = 'first_message';

  try {
    const body = await readAiRequestBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
    }

    const { currentUser, otherUser, conversationType } = body;
    otherUserProfile = otherUser;
    categoryType = conversationType || 'first_message';

    if (!currentUser || !otherUser) {
      return NextResponse.json(
        { error: 'Missing user profiles' },
        { status: 400 }
      );
    }

    // 1. Check Platform Settings (Admin Killswitch and daily limit)
    let dailyLimit = DEFAULT_DAILY_LIMIT;
    try {
      const { data: settings } = await sb
        .from('platform_settings')
        .select('ai_icebreakers_enabled, max_daily_icebreakers')
        .eq('id', 'default')
        .maybeSingle();

      if (settings && settings.ai_icebreakers_enabled === false) {
        return NextResponse.json(
          {
            error: 'AI Conversation Starters are currently paused by the platform administrator.',
            suggestions: [],
            paused: true,
          },
          { status: 403 }
        );
      }

      if (typeof settings?.max_daily_icebreakers === 'number') {
        dailyLimit = settings.max_daily_icebreakers;
      }
    } catch {
      // Continue if platform_settings table not yet created
    }

    const blocked = await consumeAiQuota(session, 'icebreaker', dailyLimit);
    if (blocked) return blocked;

    const suggestions = await generateConversationStarters({
      currentUser,
      otherUser,
      conversationType: (categoryType as 'first_message' | 'follow_up' | 'ice_breaker') || 'first_message',
    });

    // 2. Log successful generation to ai_usage_logs
    try {
      await sb.from('ai_usage_logs').insert({
        user_id: session.user.id,
        other_user_id: otherUser.id || null,
        category: categoryType,
        success: true,
        estimated_tokens: 120,
      });
    } catch {
      // Non-blocking log
    }

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error in conversation starters API:', error);

    // Log failure
    try {
      await sb.from('ai_usage_logs').insert({
        user_id: session.user.id,
        other_user_id: otherUserProfile?.id || null,
        category: categoryType,
        success: false,
        error_message: error.message || 'Generation failed',
      });
    } catch {
      // Non-blocking
    }

    return NextResponse.json(
      { error: 'Failed to generate conversation starters' },
      { status: 500 }
    );
  }
}
