import { NextRequest, NextResponse } from 'next/server';
import { profileFromRow } from '@/lib/data';
import { completeChat } from '@/lib/groqClient';
import {
  ICEBREAKER_SYSTEM_PROMPT,
  buildIcebreakerPrompt,
  fallbackIcebreakers,
  isIcebreakerCategory,
  parseIcebreakers,
} from '@/lib/icebreakers';
import { consumeAiQuota, readAiRequestBody, requireActiveUser } from '@/lib/user-auth';

const DEFAULT_DAILY_LIMIT = 15;
const MAX_AVOID = 6;

export async function POST(request: NextRequest) {
  const session = await requireActiveUser(request);
  if (session instanceof NextResponse) return session;

  const sb = session.client;
  let otherUserId: string | null = null;
  let category = 'guidance';

  try {
    const body = await readAiRequestBody(request);
    if (!body) {
      return NextResponse.json({ error: 'Request is too large' }, { status: 413 });
    }

    otherUserId = typeof body.otherUserId === 'string' ? body.otherUserId : null;
    if (!otherUserId) {
      return NextResponse.json({ error: 'Missing otherUserId' }, { status: 400 });
    }

    if (!isIcebreakerCategory(body.category)) {
      return NextResponse.json({ error: 'Unknown icebreaker category' }, { status: 400 });
    }
    const categoryId = body.category;
    category = categoryId;

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
            error: 'AI icebreakers are paused right now. A simple hello works just as well!',
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

    // 2. Read both profiles from the database, so a request cannot supply made-up ones
    const [{ data: senderRow }, { data: otherRow }] = await Promise.all([
      sb.from('users').select('*').eq('id', session.user.id).maybeSingle(),
      sb.from('user_profiles').select('*').eq('id', otherUserId).maybeSingle(),
    ]);

    if (!senderRow || !otherRow) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    const blocked = await consumeAiQuota(session, 'icebreaker', dailyLimit);
    if (blocked) return blocked;

    const sender = profileFromRow(senderRow);
    const other = profileFromRow(otherRow);
    const avoid: string[] = Array.isArray(body.avoid)
      ? body.avoid.filter((line: unknown): line is string => typeof line === 'string').slice(0, MAX_AVOID)
      : [];

    let suggestions: string[] = [];
    let generationError: string | null = null;
    try {
      const output = await completeChat(
        buildIcebreakerPrompt(sender, other, categoryId, avoid),
        ICEBREAKER_SYSTEM_PROMPT,
        { maxTokens: 300, temperature: 0.8 }
      );
      suggestions = parseIcebreakers(output);
    } catch (error: any) {
      generationError = error?.message || 'Generation failed';
      console.warn('Icebreaker generation failed, using profile-based suggestions:', generationError);
    }

    if (!suggestions.length) {
      suggestions = fallbackIcebreakers(sender, other, categoryId);
    }

    // 3. Log aggregate usage for the admin dashboard
    await sb.from('ai_usage_logs').insert({
      user_id: session.user.id,
      other_user_id: otherUserId,
      category,
      success: !generationError,
      error_message: generationError,
      estimated_tokens: 120,
    });

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error('Error in conversation starters API:', error);

    await sb.from('ai_usage_logs').insert({
      user_id: session.user.id,
      other_user_id: otherUserId,
      category,
      success: false,
      error_message: error?.message || 'Generation failed',
    });

    return NextResponse.json(
      { error: 'Could not come up with ideas just now. Please try again.' },
      { status: 500 }
    );
  }
}
