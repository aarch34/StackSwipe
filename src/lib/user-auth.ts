import { NextRequest, NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createAdminScopedClient } from '@/lib/admin-auth';

export interface UserSession {
  user: User;
  client: SupabaseClient;
}

export type AiUsageKind = 'chatbot' | 'icebreaker' | 'reply';

// Largest accepted request body for the AI routes that take profiles as input.
const MAX_AI_BODY_CHARS = 20000;

/** Verifies the request's bearer token. The returned client acts as that user, so RLS applies. */
export async function getUserSession(request: NextRequest): Promise<UserSession | null> {
  const header = request.headers.get('authorization');
  if (!header?.toLowerCase().startsWith('bearer ')) return null;

  const token = header.substring(7).trim();
  if (!token) return null;

  const client = createAdminScopedClient(token);
  const { data: { user }, error } = await client.auth.getUser(token);
  return error || !user ? null : { user, client };
}

/** Returns the session, or the response to send when the user may not use AI features. */
export async function requireActiveUser(
  request: NextRequest
): Promise<UserSession | NextResponse> {
  const session = await getUserSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Please sign in to use this feature.' }, { status: 401 });
  }

  const { data, error } = await session.client
    .from('users')
    .select('account_status')
    .eq('id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Could not check account status:', error);
    return NextResponse.json({ error: 'Please try again in a moment.' }, { status: 503 });
  }

  if ((data?.account_status ?? 'active') !== 'active') {
    return NextResponse.json(
      { error: 'AI features are not available for this account.' },
      { status: 403 }
    );
  }

  return session;
}

/**
 * Counts one AI call against the user's daily limit. Returns the response to send when the call
 * must not go ahead. It fails closed, because an unchecked call spends real API credit.
 */
export async function consumeAiQuota(
  session: UserSession,
  kind: AiUsageKind,
  dailyLimit: number
): Promise<NextResponse | null> {
  const { data: used, error } = await session.client.rpc('increment_ai_usage', { p_kind: kind });

  if (error) {
    console.error('Could not check AI quota:', error);
    return NextResponse.json({ error: 'Please try again in a moment.' }, { status: 503 });
  }

  if (used > dailyLimit) {
    return NextResponse.json(
      { error: 'You have reached the daily limit for this feature. Please try again tomorrow.' },
      { status: 429 }
    );
  }

  return null;
}

/** Parses a JSON body, returning null when it is too large to be a genuine request. */
export async function readAiRequestBody(request: NextRequest): Promise<any | null> {
  const raw = await request.text();
  return raw.length > MAX_AI_BODY_CHARS ? null : JSON.parse(raw);
}
