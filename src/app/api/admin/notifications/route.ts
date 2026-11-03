import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, createAdminScopedClient, getBaseClient } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const { data: notifications, error } = await sb
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.warn('Could not query admin_notifications:', error);
      return NextResponse.json({ notifications: [] });
    }

    const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

    return NextResponse.json({
      notifications: notifications || [],
      unreadCount,
    });
  } catch (error: any) {
    console.error('Error fetching admin notifications:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { notificationId, markAllRead, isRead } = await request.json();

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    if (markAllRead) {
      await sb
        .from('admin_notifications')
        .update({ is_read: true })
        .eq('is_read', false);

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const { data: updated, error } = await sb
      .from('admin_notifications')
      .update({ is_read: typeof isRead === 'boolean' ? isRead : true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
