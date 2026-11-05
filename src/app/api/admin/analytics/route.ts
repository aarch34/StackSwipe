import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, createAdminScopedClient, getBaseClient } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '30d';
    const customStart = searchParams.get('startDate');
    const customEnd = searchParams.get('endDate');

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const now = new Date();
    let numDays = 30;
    let startDate: Date;

    if (range === 'today') {
      numDays = 1;
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === '7d') {
      numDays = 7;
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    } else if (range === '90d') {
      numDays = 90;
      startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    } else if (range === 'custom' && customStart) {
      startDate = new Date(customStart);
      const endDate = customEnd ? new Date(customEnd) : now;
      numDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
    } else {
      numDays = 30;
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    }

    const startIso = startDate.toISOString();

    // Query records in time window
    const [usersRes, swipesRes, matchesRes, messagesRes, reportsRes] = await Promise.all([
      sb.from('users').select('id, created_at, last_active_at').gte('created_at', startIso),
      sb.from('swipes').select('id, direction, created_at').gte('created_at', startIso),
      sb.from('matches').select('id, created_at').gte('created_at', startIso),
      sb.from('messages').select('id, created_at').gte('created_at', startIso),
      sb.from('user_reports').select('id, created_at, status').gte('created_at', startIso),
    ]);

    const users = usersRes.data || [];
    const swipes = swipesRes.data || [];
    const matches = matchesRes.data || [];
    const messages = messagesRes.data || [];
    const reports = reportsRes.data || [];

    // Bucket into dates
    // For range === 'today', bucket into 4-hour intervals
    const isHourly = range === 'today';
    const buckets: Record<
      string,
      {
        date: string;
        label: string;
        newUsers: number;
        swipes: number;
        rightSwipes: number;
        leftSwipes: number;
        matches: number;
        messages: number;
        reports: number;
        dau: number;
      }
    > = {};

    if (isHourly) {
      // 6 buckets of 4 hours
      for (let h = 0; h < 24; h += 4) {
        const key = `${h.toString().padStart(2, '0')}:00`;
        buckets[key] = {
          date: key,
          label: `${h}:00 - ${h + 4}:00`,
          newUsers: 0,
          swipes: 0,
          rightSwipes: 0,
          leftSwipes: 0,
          matches: 0,
          messages: 0,
          reports: 0,
          dau: 0,
        };
      }
    } else {
      // Generate daily buckets
      for (let i = numDays - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const key = d.toISOString().split('T')[0];
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        buckets[key] = {
          date: key,
          label,
          newUsers: 0,
          swipes: 0,
          rightSwipes: 0,
          leftSwipes: 0,
          matches: 0,
          messages: 0,
          reports: 0,
          dau: 0,
        };
      }
    }

    const getKey = (isoString?: string) => {
      if (!isoString) return null;
      if (isHourly) {
        const hour = new Date(isoString).getHours();
        const bucketHour = Math.floor(hour / 4) * 4;
        return `${bucketHour.toString().padStart(2, '0')}:00`;
      }
      return isoString.split('T')[0];
    };

    // Populate user counts
    users.forEach((u) => {
      const k = getKey(u.created_at);
      if (k && buckets[k]) {
        buckets[k].newUsers += 1;
      }
    });

    // Populate swipes
    swipes.forEach((s) => {
      const k = getKey(s.created_at);
      if (k && buckets[k]) {
        buckets[k].swipes += 1;
        if (s.direction === 'right') buckets[k].rightSwipes += 1;
        else buckets[k].leftSwipes += 1;
      }
    });

    // Populate matches
    matches.forEach((m) => {
      const k = getKey(m.created_at);
      if (k && buckets[k]) {
        buckets[k].matches += 1;
      }
    });

    // Populate messages
    messages.forEach((msg) => {
      const k = getKey(msg.created_at);
      if (k && buckets[k]) {
        buckets[k].messages += 1;
      }
    });

    // Populate reports
    reports.forEach((r) => {
      const k = getKey(r.created_at);
      if (k && buckets[k]) {
        buckets[k].reports += 1;
      }
    });

    // DAU estimate from activity on each day
    Object.values(buckets).forEach((b) => {
      b.dau = Math.max(b.newUsers, Math.ceil((b.swipes + b.messages + b.matches) / 3));
    });

    const timeSeries = Object.values(buckets);

    // Retention estimate: users with last_active > 7 days after created_at
    const { count: totalCount } = await sb.from('users').select('*', { count: 'exact', head: true });
    const userTotal = totalCount || 0;
    const activeWeek = users.length;
    const retentionRate = userTotal > 0 ? Math.min(100, Math.round((activeWeek / userTotal) * 100)) : 0;

    // Null until guidance_platform.sql has been applied
    const { data: mission, error: missionError } = await sb.rpc('admin_mission_metrics');
    if (missionError) console.warn('Mission metrics unavailable:', missionError.message);

    return NextResponse.json({
      range,
      mission: mission ?? null,
      timeSeries,
      summary: {
        totalNewUsers: users.length,
        totalSwipes: swipes.length,
        totalMatches: matches.length,
        totalMessages: messages.length,
        totalReports: reports.length,
        retentionRate,
      },
    });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
