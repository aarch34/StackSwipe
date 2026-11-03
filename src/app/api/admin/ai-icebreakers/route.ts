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

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Fetch AI platform settings
    let settings = {
      ai_icebreakers_enabled: true,
      max_daily_icebreakers: 15,
    };

    try {
      const { data: s } = await sb.from('platform_settings').select('*').eq('id', 'default').maybeSingle();
      if (s) {
        settings = {
          ai_icebreakers_enabled: s.ai_icebreakers_enabled ?? true,
          max_daily_icebreakers: s.max_daily_icebreakers ?? 15,
        };
      }
    } catch (e) {
      console.warn('Could not read platform_settings:', e);
    }

    // 2. Aggregate logs from ai_usage_logs
    let totalGenerations = 0;
    let todayGenerations = 0;
    let monthGenerations = 0;
    let failedGenerations = 0;
    let categoryCounts: Record<string, number> = {
      first_message: 0,
      casual_intro: 0,
      tech_deep_dive: 0,
      collaborative_hack: 0,
    };
    let recentErrors: any[] = [];

    try {
      const { count: total } = await sb.from('ai_usage_logs').select('*', { count: 'exact', head: true });
      totalGenerations = total || 0;

      const { count: today } = await sb.from('ai_usage_logs').select('*', { count: 'exact', head: true }).gte('created_at', startOfToday);
      todayGenerations = today || 0;

      const { count: month } = await sb.from('ai_usage_logs').select('*', { count: 'exact', head: true }).gte('created_at', thirtyDaysAgo);
      monthGenerations = month || 0;

      const { count: fails } = await sb.from('ai_usage_logs').select('*', { count: 'exact', head: true }).eq('success', false);
      failedGenerations = fails || 0;

      const { data: sampleCategories } = await sb.from('ai_usage_logs').select('category').limit(200);
      (sampleCategories || []).forEach((c) => {
        const cat = c.category || 'first_message';
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });

      const { data: errorLogs } = await sb
        .from('ai_usage_logs')
        .select('*')
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(10);

      recentErrors = errorLogs || [];
    } catch (logErr) {
      console.warn('ai_usage_logs table query error:', logErr);
    }

    // Cost estimation: ~$0.0005 per icebreaker generation
    const estimatedCost = Number((totalGenerations * 0.0005).toFixed(4));

    return NextResponse.json({
      settings,
      stats: {
        totalGenerated: totalGenerations,
        dailyUsage: todayGenerations,
        monthlyUsage: monthGenerations,
        failedGenerations,
        apiErrors: failedGenerations,
        estimatedCostUSD: estimatedCost,
        categoryBreakdown: categoryCounts,
      },
      recentErrors,
    });
  } catch (error: any) {
    console.error('Error fetching AI analytics:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.adminUser.role, 'edit_settings')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
    }

    const { enabled, maxDailyLimit } = await request.json();

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const updatePayload: any = {
      updated_by: session.adminUser.id,
      updated_at: new Date().toISOString(),
    };

    if (typeof enabled === 'boolean') {
      updatePayload.ai_icebreakers_enabled = enabled;
    }

    if (typeof maxDailyLimit === 'number') {
      updatePayload.max_daily_icebreakers = Math.max(1, maxDailyLimit);
    }

    const { data: updated, error: uErr } = await sb
      .from('platform_settings')
      .upsert({ id: 'default', ...updatePayload })
      .select()
      .single();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    await logAdminAction({
      adminUser: session.adminUser,
      token: session.token,
      action: 'AI_SETTINGS_UPDATED',
      targetType: 'platform_settings',
      targetId: 'default',
      newState: updatePayload,
      reason: 'Admin updated AI Icebreaker settings',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      settings: updated,
    });
  } catch (error: any) {
    console.error('Error updating AI settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
