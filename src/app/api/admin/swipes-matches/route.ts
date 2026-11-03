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
    const userIdSearch = searchParams.get('userId')?.trim();

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    // 1. Swipes aggregates
    const { count: totalSwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true });

    const { count: todaySwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    const { count: rightSwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'right');

    const { count: leftSwipes } = await sb
      .from('swipes')
      .select('*', { count: 'exact', head: true })
      .eq('direction', 'left');

    const { count: totalUsers } = await sb
      .from('users')
      .select('*', { count: 'exact', head: true });

    // 2. Matches
    let matchesQuery = sb
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(userIdSearch ? 50 : 25);

    if (userIdSearch) {
      matchesQuery = matchesQuery.contains('user_ids', [userIdSearch]);
    }

    const { data: recentMatches, count: matchCount } = await matchesQuery;

    // Collect participant user IDs
    const participantIds = new Set<string>();
    (recentMatches || []).forEach((m) => {
      if (Array.isArray(m.user_ids)) {
        m.user_ids.forEach((id: string) => participantIds.add(id));
      }
    });

    const userProfileMap: Record<string, any> = {};
    if (participantIds.size > 0) {
      const { data: usersData } = await sb
        .from('users')
        .select('id, name, email, photo_url, job_title, company')
        .in('id', Array.from(participantIds));

      (usersData || []).forEach((u) => {
        userProfileMap[u.id] = u;
      });
    }

    const enrichedMatches = (recentMatches || []).map((m) => {
      const u1Id = m.user_ids?.[0];
      const u2Id = m.user_ids?.[1];
      return {
        id: m.id,
        user1: userProfileMap[u1Id] || { id: u1Id, name: 'User 1' },
        user2: userProfileMap[u2Id] || { id: u2Id, name: 'User 2' },
        createdAt: m.created_at,
      };
    });

    // 3. Most active swipers
    const { data: topSwipersData } = await sb
      .from('swipes')
      .select('swiper_id')
      .limit(300);

    const swipeFreq: Record<string, number> = {};
    (topSwipersData || []).forEach((s) => {
      swipeFreq[s.swiper_id] = (swipeFreq[s.swiper_id] || 0) + 1;
    });

    const sortedSwipers = Object.entries(swipeFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topSwiperIds = sortedSwipers.map((s) => s[0]);
    let topActiveUsers: any[] = [];
    if (topSwiperIds.length > 0) {
      const { data: swiperProfiles } = await sb
        .from('users')
        .select('id, name, email, photo_url')
        .in('id', topSwiperIds);

      topActiveUsers = sortedSwipers.map(([id, count]) => {
        const p = swiperProfiles?.find((u) => u.id === id);
        return {
          id,
          name: p?.name || 'Active User',
          email: p?.email || '',
          photoURL: p?.photo_url || null,
          swipeCount: count,
          suspicious: count > 150, // Flag high-speed swipe bots
        };
      });
    }

    const totalSwipeCount = totalSwipes || 0;
    const totalMatchCount = matchCount || recentMatches?.length || 0;
    const avgSwipesPerUser =
      (totalUsers || 0) > 0 ? Number((totalSwipeCount / (totalUsers || 1)).toFixed(1)) : 0;
    const matchSuccessRate =
      totalSwipeCount > 0
        ? Number(((totalMatchCount * 2) / totalSwipeCount * 100).toFixed(1))
        : 0;

    return NextResponse.json({
      metrics: {
        totalSwipes: totalSwipeCount,
        dailySwipes: todaySwipes || 0,
        rightSwipes: rightSwipes || 0,
        leftSwipes: leftSwipes || 0,
        totalMatches: totalMatchCount,
        matchSuccessRate,
        averageSwipesPerUser: avgSwipesPerUser,
      },
      recentMatches: enrichedMatches,
      topActiveUsers,
    });
  } catch (error: any) {
    console.error('Error fetching swipes/matches data:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.adminUser.role, 'moderate')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { matchId, reason } = await request.json();

    if (!matchId) {
      return NextResponse.json({ error: 'Match ID is required' }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json(
        { error: 'A mandatory reason is required to remove a match' },
        { status: 400 }
      );
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    // Fetch existing match for audit
    const { data: matchData } = await sb
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .maybeSingle();

    const { error: delErr } = await sb.from('matches').delete().eq('id', matchId);

    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }

    // Record audit log
    await logAdminAction({
      adminUser: session.adminUser,
      token: session.token,
      action: 'MATCH_REMOVED',
      targetType: 'match',
      targetId: matchId,
      previousState: matchData,
      reason: reason.trim(),
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Match removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing match:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
