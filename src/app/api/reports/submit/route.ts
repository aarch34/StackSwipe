import { NextRequest, NextResponse } from 'next/server';
import { getUserSession } from '@/lib/user-auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getUserSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Please sign in to submit a report.' }, { status: 401 });
    }

    const { reportedId, category, description, relevantMessageIds } = await request.json();
    const reporterId = session.user.id;

    if (!reportedId || !category) {
      return NextResponse.json(
        { error: 'Missing required report fields (reportedId, category)' },
        { status: 400 }
      );
    }

    if (reporterId === reportedId) {
      return NextResponse.json(
        { error: 'You cannot submit a report against yourself.' },
        { status: 400 }
      );
    }

    // The on_report_notify_admin database trigger alerts the admins.
    const { data: newReport, error: insertErr } = await session.client
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
