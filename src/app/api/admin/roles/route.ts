import { NextRequest, NextResponse } from 'next/server';
import {
  verifyAdminSession,
  createAdminScopedClient,
  getBaseClient,
  hasPermission,
  logAdminAction,
  AdminRole,
} from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const { data: admins, error } = await sb
      .from('admin_users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Could not query admin_users:', error);
      // Fallback with session admin
      return NextResponse.json({ admins: [session.adminUser] });
    }

    return NextResponse.json({ admins: admins || [session.adminUser] });
  } catch (error: any) {
    console.error('Error in admin roles GET API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.adminUser.role, 'manage_roles')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
    }

    const { email, name, role } = await request.json();

    if (!email || !role) {
      return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    const validRoles: AdminRole[] = ['super_admin', 'moderator', 'support_admin', 'analyst'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: `Invalid role: ${role}` }, { status: 400 });
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    // Check if user exists in auth or users table
    const { data: targetUser } = await sb
      .from('users')
      .select('id, email, name')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    const adminId = targetUser?.id || crypto.randomUUID();

    const { data: newAdmin, error } = await sb
      .from('admin_users')
      .upsert({
        id: adminId,
        email: email.trim().toLowerCase(),
        name: name?.trim() || targetUser?.name || 'Admin',
        role,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction({
      adminUser: session.adminUser,
      token: session.token,
      action: 'ADMIN_ROLE_ASSIGNED',
      targetType: 'admin_user',
      targetId: adminId,
      newState: { email, role },
      reason: `Assigned role ${role} to ${email}`,
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, admin: newAdmin });
  } catch (error: any) {
    console.error('Error assigning admin role:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(session.adminUser.role, 'manage_roles')) {
      return NextResponse.json({ error: 'Forbidden: Super Admin only' }, { status: 403 });
    }

    const { adminId, role, isActive } = await request.json();

    if (!adminId) {
      return NextResponse.json({ error: 'Admin ID required' }, { status: 400 });
    }

    if (adminId === session.adminUser.id && role && role !== 'super_admin') {
      return NextResponse.json(
        { error: 'You cannot demote your own Super Admin account' },
        { status: 400 }
      );
    }

    const sb = session.token ? createAdminScopedClient(session.token) : getBaseClient();

    const updatePayload: any = {
      updated_at: new Date().toISOString(),
    };

    if (role) updatePayload.role = role;
    if (typeof isActive === 'boolean') updatePayload.is_active = isActive;

    const { data: updated, error } = await sb
      .from('admin_users')
      .update(updatePayload)
      .eq('id', adminId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await logAdminAction({
      adminUser: session.adminUser,
      token: session.token,
      action: 'ADMIN_ROLE_UPDATED',
      targetType: 'admin_user',
      targetId: adminId,
      newState: updatePayload,
      reason: 'Role or active status modified',
      ipAddress: request.headers.get('x-forwarded-for') || undefined,
    });

    return NextResponse.json({ success: true, admin: updated });
  } catch (error: any) {
    console.error('Error updating admin role:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
