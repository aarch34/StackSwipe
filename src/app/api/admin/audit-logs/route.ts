import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminSession,
  createAdminScopedClient,
  getBaseClient,
  hasPermission,
} from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.adminUser.role, 'view_audit_logs')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'all';
    const targetType = searchParams.get('targetType') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const offset = (page - 1) * limit;

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    let query = sb
      .from('admin_audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (action !== 'all') {
      query = query.eq('action', action);
    }

    if (targetType !== 'all') {
      query = query.eq('target_type', targetType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: logs, count, error } = await query;

    if (error) {
      console.warn('Could not query admin_audit_logs:', error);
      return NextResponse.json({ logs: [], total: 0, page, limit, totalPages: 1 });
    }

    const total = count || 0;

    return NextResponse.json({
      logs: logs || [],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
