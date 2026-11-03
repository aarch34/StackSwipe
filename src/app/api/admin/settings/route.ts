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
    const sb = getBaseClient();
    const { data: settings, error } = await sb
      .from('platform_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !settings) {
      return NextResponse.json({
        settings: {
          id: 'default',
          registration_enabled: true,
          maintenance_mode: false,
          ai_icebreakers_enabled: true,
          max_daily_icebreakers: 15,
          default_suspension_days: 7,
          community_guidelines:
            'Respect other developers. Zero tolerance for spam, harassment, hate speech, or impersonation.',
          report_categories: [
            'fake_profile',
            'impersonation',
            'harassment',
            'inappropriate_behaviour',
            'spam',
            'scamming',
            'suspicious_account',
            'unwanted_messages',
            'other',
          ],
          system_announcement: '',
        },
      });
    }

    return NextResponse.json({ settings });
  } catch (error: any) {
    console.error('Error fetching platform settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.adminUser.role, 'edit_settings')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    // Fetch previous state
    const { data: prev } = await sb
      .from('platform_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    const updatePayload: any = {
      updated_by: session.adminUser.id,
      updated_at: new Date().toISOString(),
    };

    if (typeof body.registration_enabled === 'boolean') {
      updatePayload.registration_enabled = body.registration_enabled;
    }
    if (typeof body.maintenance_mode === 'boolean') {
      updatePayload.maintenance_mode = body.maintenance_mode;
    }
    if (typeof body.ai_icebreakers_enabled === 'boolean') {
      updatePayload.ai_icebreakers_enabled = body.ai_icebreakers_enabled;
    }
    if (typeof body.max_daily_icebreakers === 'number') {
      updatePayload.max_daily_icebreakers = body.max_daily_icebreakers;
    }
    if (typeof body.default_suspension_days === 'number') {
      updatePayload.default_suspension_days = body.default_suspension_days;
    }
    if (typeof body.community_guidelines === 'string') {
      updatePayload.community_guidelines = body.community_guidelines.trim();
    }
    if (Array.isArray(body.report_categories)) {
      updatePayload.report_categories = body.report_categories;
    }
    if (typeof body.system_announcement === 'string') {
      updatePayload.system_announcement = body.system_announcement.trim();
    }

    const { data: updated, error } = await sb
      .from('platform_settings')
      .upsert({ id: 'default', ...updatePayload })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction({
      adminUser: session.adminUser,
      token: session.token,
      action: 'PLATFORM_SETTINGS_UPDATED',
      targetType: 'platform_settings',
      targetId: 'default',
      previousState: prev,
      newState: updatePayload,
      reason: 'Platform settings changed by Super Admin',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, settings: updated });
  } catch (error: any) {
    console.error('Error updating platform settings:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
