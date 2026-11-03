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
    const investigateReportId = searchParams.get('reportId');
    const investigateReason = searchParams.get('reason');

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Overview counts
    const { count: totalMessages } = await sb
      .from('messages')
      .select('*', { count: 'exact', head: true });

    const { count: messagesToday } = await sb
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfToday);

    const { count: messagesThisWeek } = await sb
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo);

    // Estimate active conversations (distinct matches with recent messages)
    const { data: recentMatchesWithMsgs } = await sb
      .from('messages')
      .select('match_id')
      .gte('created_at', sevenDaysAgo)
      .limit(200);

    const activeConversationCount = new Set(
      (recentMatchesWithMsgs || []).map((m) => m.match_id)
    ).size;

    // 2. PRIVACY-CONTROLLED AUDITED INVESTIGATION
    let investigatedMessages: any[] = [];
    if (investigateReportId) {
      if (!hasPermission(session.adminUser.role, 'messaging_inspect')) {
        return NextResponse.json(
          { error: 'Forbidden: Insufficient safety role for message inspection' },
          { status: 403 }
        );
      }

      // Fetch the report to verify it exists and retrieve relevant message IDs
      const { data: reportData } = await sb
        .from('user_reports')
        .select('*')
        .eq('id', investigateReportId)
        .maybeSingle();

      if (reportData) {
        let msgQuery = sb.from('messages').select('*').order('created_at', { ascending: true });

        if (
          Array.isArray(reportData.relevant_message_ids) &&
          reportData.relevant_message_ids.length > 0
        ) {
          msgQuery = msgQuery.in('id', reportData.relevant_message_ids);
        } else {
          // Look for match containing both reporter and reported
          const { data: matched } = await sb
            .from('matches')
            .select('id')
            .contains('user_ids', [reportData.reporter_id, reportData.reported_id])
            .maybeSingle();

          if (matched) {
            msgQuery = msgQuery.eq('match_id', matched.id).limit(20);
          } else {
            msgQuery = msgQuery
              .or(`sender_id.eq.${reportData.reported_id},sender_id.eq.${reportData.reporter_id}`)
              .limit(15);
          }
        }

        const { data: msgs } = await msgQuery;
        investigatedMessages = msgs || [];

        // Log this safety audit inspection
        await logAdminAction({
          adminUser: session.adminUser,
          token: session.token,
          action: 'MESSAGE_INVESTIGATION_ACCESSED',
          targetType: 'report',
          targetId: investigateReportId,
          reason:
            investigateReason || `Investigated reported messages for report: ${reportData.category}`,
          ipAddress: request.headers.get('x-forwarded-for') || undefined,
        });
      }
    }

    return NextResponse.json({
      metrics: {
        totalMessages: totalMessages || 0,
        messagesSentToday: messagesToday || 0,
        messagesSentThisWeek: messagesThisWeek || 0,
        activeConversations: activeConversationCount,
        deliveryFailures: 0,
      },
      investigatedMessages,
    });
  } catch (error: any) {
    console.error('Error in admin messages API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
