import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, createAdminScopedClient, getBaseClient } from '@/lib/admin-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: userId } = await params;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    // 1. Fetch user profile
    const { data: user, error: userErr } = await sb
      .from('users')
      .select('*')
      .or(`id.eq.${userId},firebase_uid.eq.${userId}`)
      .maybeSingle();

    if (userErr || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // 2. Fetch platform activity counters
    const { count: totalSwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('swiper_id', user.id);

    const { data: userMatches } = await sb
      .from('matches')
      .select('id, user_ids, created_at');

    const matchedList = (userMatches || []).filter(
      (m) => Array.isArray(m.user_ids) && m.user_ids.includes(user.id)
    );

    const { count: totalMessages } = await sb
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_id', user.id);

    let totalIcebreakers = 0;
    try {
      const { count } = await sb
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);
      totalIcebreakers = count || 0;
    } catch {
      totalIcebreakers = 0;
    }

    // 3. Fetch reports against this user
    let reportsHistory: any[] = [];
    try {
      const { data: reports } = await sb
        .from('user_reports')
        .select('id, category, description, status, created_at, reporter_id')
        .eq('reported_id', user.id)
        .order('created_at', { ascending: false });

      reportsHistory = reports || [];
    } catch (rErr) {
      console.warn('Could not query user reports:', rErr);
    }

    // 4. Fetch moderation actions for this user
    let moderationHistory: any[] = [];
    try {
      const { data: actions } = await sb
        .from('moderation_actions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      moderationHistory = actions || [];
    } catch (mErr) {
      console.warn('Could not query moderation actions:', mErr);
    }

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name || 'Anonymous User',
        email: user.email || 'No email provided',
        photoURL: user.photo_url || null,
        headline: user.headline || '',
        bio: user.bio || '',
        age: user.age || null,
        gender: user.gender || '',
        jobTitle: user.job_title || '',
        company: user.company || '',
        experienceLevel: user.experience_level || '',
        location: user.location || '',
        college: user.college || '',
        currentWork: user.current_work || '',
        techStack: user.tech_stack || [],
        interests: user.interests || [],
        networkingTags: user.networking_tags || [],
        links: user.links || { github: '', linkedin: '' },
        account_status: user.account_status || 'active',
        suspended_until: user.suspended_until || null,
        suspension_reason: user.suspension_reason || null,
        ban_reason: user.ban_reason || null,
        warning_count: user.warning_count || 0,
        onboarding_completed: Boolean(user.onboarding_completed),
        created_at: user.created_at,
        last_active_at: user.last_active_at || user.updated_at || user.created_at,
      },
      activity: {
        totalSwipes: totalSwipes || 0,
        totalMatches: matchedList.length,
        totalMessages: totalMessages || 0,
        aiIcebreakerUsage: totalIcebreakers,
      },
      reports: reportsHistory,
      moderationActions: moderationHistory,
    });
  } catch (error: any) {
    console.error('Error fetching user detail:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
