import { NextRequest, NextResponse } from 'next/server';
import { getBaseClient, createAdminScopedClient } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { reporterId, reportedId, category, description, relevantMessageIds } =
      await request.json();

    if (!reporterId || !reportedId || !category) {
      return NextResponse.json(
        { error: 'Missing required report fields (reporterId, reportedId, category)' },
        { status: 400 }
      );
    }

    if (reporterId === reportedId) {
      return NextResponse.json(
        { error: 'You cannot submit a report against yourself.' },
        { status: 400 }
      );
    }

    // Try token from authorization header if present
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.substring(7).trim()
      : '';

    const sb = token ? createAdminScopedClient(token) : getBaseClient();

    const { data: newReport, error: insertErr } = await sb
      .from('user_reports')
      .insert({
        reporter_id: reporterId,
        reported_id: reportedId,
        category,
        description: description?.trim() || null,
        relevant_message_ids: Array.isArray(relevantMessageIds) ? relevantMessageIds : [],
        status: 'pending',
      })
      .select()
      .single();

    if (insertErr) {
      console.error('Error inserting report:', insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Also ensure admin notification is registered
    try {
      const { count } = await sb
        .from('user_reports')
        .select('*', { count: 'exact', head: true })
        .eq('reported_id', reportedId);

      const totalReports = count || 1;
      const isHighPriority = totalReports >= 3;

      await sb.from('admin_notifications').insert({
        type: isHighPriority ? 'multiple_reports' : 'new_report',
        title: isHighPriority
          ? `High Priority: User received ${totalReports} reports`
          : `New User Report: ${category.replace('_', ' ')}`,
        message: `Report filed against user ${reportedId} for reason: ${category}. Total reports: ${totalReports}.`,
        priority: isHighPriority ? 'critical' : 'medium',
        is_read: false,
        metadata: {
          report_id: newReport.id,
          reported_id: reportedId,
          reporter_id: reporterId,
          category,
        },
      });
    } catch (notifErr) {
      console.warn('Could not insert admin notification:', notifErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for keeping our developer community safe. Your report has been submitted.',
      reportId: newReport.id,
    });
  } catch (error: any) {
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
