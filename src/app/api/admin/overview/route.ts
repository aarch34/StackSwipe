import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, createAdminScopedClient, getBaseClient } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Total users count
    const { count: totalUsers } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 2. New users today, week, month
    const { count: newUsersToday } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    const { count: newUsersWeek } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    const { count: newUsersMonth } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo);

    // 3. User status counts
    const { count: suspendedUsers } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'suspended');

    const { count: bannedUsers } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('account_status', 'banned');

    // 4. Swipes count & breakdown
    const { count: totalSwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true });

    const { count: rightSwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'right');

    const { count: leftSwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'left');

    // 5. Matches count
    const { count: totalMatches } = await sb
      .from('matches')
      .select('*', { count: 'exact', head: true });

    // 6. Messages count
    const { count: totalMessages } = await sb
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const { count: messagesToday } = await sb
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    // 7. Reports count
    let pendingReports = 0;
    try {
      const { count } = await sb
        .from('user_reports')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      pendingReports = count || 0;
    } catch {
      pendingReports = 0;
    }

    // 8. AI Icebreakers Usage count
    let totalIcebreakers = 0;
    try {
      const { count } = await sb
        .from('ai_usage_logs')
        .select('*', { count: 'exact', head: true });
      totalIcebreakers = count || 0;
    } catch {
      totalIcebreakers = 0;
    }

    const totalUserCount = totalUsers || 0;
    const totalSwipeCount = totalSwipes || 0;
    const totalMatchCount = totalMatches || 0;
    const matchSuccessRate =
      totalSwipeCount > 0
        ? Number(((totalMatchCount * 2) / totalSwipeCount * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      stats: {
        totalUsers: totalUserCount,
        activeUsers: Math.max(0, totalUserCount - (suspendedUsers || 0) - (bannedUsers || 0)),
        newUsersToday: newUsersToday || 0,
        newUsersWeek: newUsersWeek || 0,
        newUsersMonth: newUsersMonth || 0,
        suspendedAccounts: suspendedUsers || 0,
        bannedAccounts: bannedUsers || 0,
        pendingReports,
        totalSwipes: totalSwipeCount,
        rightSwipes: rightSwipes || 0,
        leftSwipes: leftSwipes || 0,
        totalMatches: totalMatchCount,
        matchSuccessRate,
        totalMessages: totalMessages || 0,
        messagesToday: messagesToday || 0,
        aiIcebreakerUsage: totalIcebreakers,
      },
    });
  } catch (error: any) {
    console.error('Error in admin overview API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
