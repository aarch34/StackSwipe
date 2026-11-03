import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminSession,
  createAdminScopedClient,
  getBaseClient,
  hasPermission,
  logAdminAction,
} from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase() || '';
    const status = searchParams.get('status') || 'all';
    const sort = searchParams.get('sort') || 'newest';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const offset = (page - 1) * limit;

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    let query = sb.from('users').select('*', { count: 'exact' });

    // Filter by search query (name, email, or id)
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,id.eq.${search}`);
    }

    // Filter by account_status if not 'all'
    if (status !== 'all') {
      query = query.eq('account_status', status);
    }

    // Sort order
    if (sort === 'oldest') {
      query = query.order('created_at', { ascending: true });
    } else if (sort === 'last_active') {
      query = query.order('last_active_at', { ascending: false, nullsFirst: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data: users, count, error } = await query;

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const total = count || 0;
    const userIds = (users || []).map((u) => u.id);

    // Fetch supplemental stats for the paginated users (swipes, matches, reports)
    let swipesMap: Record<string, number> = {};
    let matchesMap: Record<string, number> = {};
    let reportsMap: Record<string, number> = {};

    if (userIds.length > 0) {
      try {
        const { data: swipesData } = await sb
          .from('swipes')
          .select('swiper_id')
          .in('swiper_id', userIds);

        (swipesData || []).forEach((s) => {
          swipesMap[s.swiper_id] = (swipesMap[s.swiper_id] || 0) + 1;
        });

        // Matches count
        const { data: matchesData } = await sb
          .from('matches')
          .select('user_ids');

        (matchesData || []).forEach((m) => {
          if (Array.isArray(m.user_ids)) {
            userIds.forEach((uid) => {
              if (m.user_ids.includes(uid)) {
                matchesMap[uid] = (matchesMap[uid] || 0) + 1;
              }
            });
          }
        });

        // Reports count
        const { data: reportsData } = await sb
          .from('user_reports')
          .select('reported_id')
          .in('reported_id', userIds);

        (reportsData || []).forEach((r) => {
          reportsMap[r.reported_id] = (reportsMap[r.reported_id] || 0) + 1;
        });
      } catch (statsErr) {
        console.warn('Could not enrich supplemental user stats:', statsErr);
      }
    }

    const enrichedUsers = (users || []).map((u) => ({
      id: u.id,
      name: u.name || 'Anonymous User',
      email: u.email || 'No email provided',
      photoURL: u.photo_url || null,
      headline: u.headline || '',
      bio: u.bio || '',
      age: u.age || null,
      location: u.location || '',
      jobTitle: u.job_title || '',
      company: u.company || '',
      techStack: u.tech_stack || [],
      account_status: u.account_status || 'active',
      suspended_until: u.suspended_until || null,
      suspension_reason: u.suspension_reason || null,
      ban_reason: u.ban_reason || null,
      warning_count: u.warning_count || 0,
      onboarding_completed: Boolean(u.onboarding_completed),
      created_at: u.created_at,
      last_active_at: u.last_active_at || u.updated_at || u.created_at,
      totalSwipes: swipesMap[u.id] || 0,
      totalMatches: matchesMap[u.id] || 0,
      reportCount: reportsMap[u.id] || 0,
    }));

    return NextResponse.json({
      users: enrichedUsers,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error('Error in admin users API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, userId, reason, durationDays } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'User ID and action are required' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A mandatory reason is required for moderation actions' },
        { status: 400 }
      );
    }

    if (!hasPermission(session.adminUser.role, 'moderate')) {
      return NextResponse.json(
        { error: 'Forbidden: Insufficient permissions for moderation actions' },
        { status: 403 }
      );
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    // Fetch existing user state
    const { data: existingUser, error: userFetchErr } = await sb
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (userFetchErr || !existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const previousState = {
      account_status: existingUser.account_status || 'active',
      suspended_until: existingUser.suspended_until,
      suspension_reason: existingUser.suspension_reason,
      ban_reason: existingUser.ban_reason,
      warning_count: existingUser.warning_count || 0,
    };

    let updatePayload: any = {};
    let moderationType = action;

    if (action === 'suspend') {
      const days = parseInt(durationDays, 10) || 7;
      const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      updatePayload = {
        account_status: 'suspended',
        suspended_until: suspendedUntil,
        suspension_reason: reason.trim(),
      };
    } else if (action === 'ban') {
      updatePayload = {
        account_status: 'banned',
        suspended_until: null,
        ban_reason: reason.trim(),
      };
    } else if (action === 'restore') {
      updatePayload = {
        account_status: 'active',
        suspended_until: null,
        suspension_reason: null,
        ban_reason: null,
      };
    } else if (action === 'soft_delete') {
      updatePayload = {
        account_status: 'soft_deleted',
        suspension_reason: `Soft-deleted: ${reason.trim()}`,
      };
    } else if (action === 'warning') {
      updatePayload = {
        warning_count: (existingUser.warning_count || 0) + 1,
      };
    } else {
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const { data: updatedUser, error: updateErr } = await sb
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select()
      .single();

    if (updateErr) {
      console.error('Error applying moderation update:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // Record moderation action
    try {
      await sb.from('moderation_actions').insert({
        user_id: userId,
        admin_id: session.adminUser.id,
        action_type: moderationType,
        reason: reason.trim(),
        duration_days: action === 'suspend' ? (parseInt(durationDays, 10) || 7) : null,
      });
    } catch (mErr) {
      console.warn('Could not insert moderation action record:', mErr);
    }

    // Record immutable audit log
    await logAdminAction({
      adminUser: session.adminUser,
      token: session.token,
      action: `USER_${action.toUpperCase()}`,
      targetType: 'user',
      targetId: userId,
      previousState,
      newState: updatePayload,
      reason: reason.trim(),
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Successfully executed ${action} on user`,
      user: updatedUser,
    });
  } catch (error: any) {
    console.error('Error in user moderation API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
