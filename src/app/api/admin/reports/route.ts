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
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || 'all';

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    let query = sb
      .from('user_reports')
      .select('*')
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    if (category !== 'all') {
      query = query.eq('category', category);
    }

    const { data: reports, error } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Collect user IDs for reporter and reported
    const allUserIds = new Set<string>();
    (reports || []).forEach((r) => {
      if (r.reporter_id) allUserIds.add(r.reporter_id);
      if (r.reported_id) allUserIds.add(r.reported_id);
    });

    const userMap: Record<string, any> = {};
    const reportCountMap: Record<string, number> = {};

    if (allUserIds.size > 0) {
      const { data: userData } = await sb
        .from('users')
        .select('id, name, email, photo_url, account_status')
        .in('id', Array.from(allUserIds));

      (userData || []).forEach((u) => {
        userMap[u.id] = u;
      });

      // Calculate total report count per reported user for duplicate detection
      (reports || []).forEach((r) => {
        reportCountMap[r.reported_id] = (reportCountMap[r.reported_id] || 0) + 1;
      });
    }

    const enriched = (reports || []).map((r) => ({
      ...r,
      reporter: userMap[r.reporter_id] || {
        id: r.reporter_id,
        name: 'Unknown User',
        email: 'N/A',
      },
      reported: userMap[r.reported_id] || {
        id: r.reported_id,
        name: 'Unknown User',
        email: 'N/A',
        account_status: 'active',
      },
      totalReportsOnUser: reportCountMap[r.reported_id] || 1,
    }));

    return NextResponse.json({ reports: enriched });
  } catch (error: any) {
    console.error('Error in admin reports GET API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.adminUser.role, 'moderate')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { reportId, status, adminNotes, action, reason, durationDays } = await request.json();

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 });
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    // 1. Fetch current report
    const { data: existingReport, error: rErr } = await sb
      .from('user_reports')
      .select('*')
      .eq('id', reportId)
      .maybeSingle();

    if (rErr || !existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const updatePayload: any = {
      status: status || existingReport.status,
      admin_notes: adminNotes !== undefined ? adminNotes : existingReport.admin_notes,
      resolved_by: session.adminUser.id,
      resolved_at: ['resolved', 'dismissed'].includes(status) ? new Date().toISOString() : null,
    };

    const { data: updatedReport, error: uErr } = await sb
      .from('user_reports')
      .update(updatePayload)
      .eq('id', reportId)
      .select()
      .single();

    if (uErr) {
      return NextResponse.json({ error: uErr.message }, { status: 500 });
    }

    // 2. If a moderation action was combined with this resolution
    if (action && existingReport.reported_id) {
      const actionReason = reason || `Report resolution: ${existingReport.category}`;
      let userUpdate: any = {};

      if (action === 'suspend') {
        const days = parseInt(durationDays, 10) || 7;
        const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        userUpdate = {
          account_status: 'suspended',
          suspended_until: suspendedUntil,
          suspension_reason: actionReason,
        };
      } else if (action === 'ban') {
        userUpdate = {
          account_status: 'banned',
          ban_reason: actionReason,
        };
      } else if (action === 'warning') {
        const { data: reportedUser } = await sb
          .from('users')
          .select('warning_count')
          .eq('id', existingReport.reported_id)
          .maybeSingle();
        userUpdate = {
          warning_count: (reportedUser?.warning_count || 0) + 1,
        };
      }

      if (Object.keys(userUpdate).length > 0) {
        await sb.from('users').update(userUpdate).eq('id', existingReport.reported_id);

        try {
          await sb.from('moderation_actions').insert({
            user_id: existingReport.reported_id,
            admin_id: session.adminUser.id,
            action_type: action,
            reason: actionReason,
            report_id: reportId,
            duration_days: action === 'suspend' ? (parseInt(durationDays, 10) || 7) : null,
          });
        } catch (mErr) {
          console.warn('Could not record moderation action:', mErr);
        }
      }
    }

    // Record audit log
    await logAdminAction({
      adminUser: session.adminUser,
      token: session.token,
      action: `REPORT_${(status || 'UPDATED').toUpperCase()}`,
      targetType: 'report',
      targetId: reportId,
      previousState: { status: existingReport.status, notes: existingReport.admin_notes },
      newState: updatePayload,
      reason: adminNotes || reason || `Updated report status to ${status}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({
      success: true,
      report: updatedReport,
    });
  } catch (error: any) {
    console.error('Error in admin reports PATCH API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
