import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export type AdminRole = 'super_admin' | 'moderator' | 'support_admin' | 'analyst';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AdminSession {
  adminUser: AdminUser;
  token: string;
  // False when the account is only on the SUPER_ADMIN_EMAILS list. The database decides what
  // an admin can read from admin_users, so without a row every admin page comes back empty.
  databaseAccess: boolean;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Helper to create an authenticated supabase client scoped to the admin's session token
export function createAdminScopedClient(token: string) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

// Fallback base client using anon key
export function getBaseClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}

export function hasPermission(
  role: AdminRole,
  action: 'manage_users' | 'moderate' | 'manage_roles' | 'edit_settings' | 'view_audit_logs' | 'view_analytics' | 'messaging_inspect'
): boolean {
  switch (action) {
    case 'manage_roles':
    case 'edit_settings':
      return role === 'super_admin';
    case 'moderate':
    case 'messaging_inspect':
      return role === 'super_admin' || role === 'moderator';
    case 'manage_users':
      return role === 'super_admin' || role === 'moderator' || role === 'support_admin';
    case 'view_audit_logs':
      return role === 'super_admin' || role === 'moderator' || role === 'analyst';
    case 'view_analytics':
      return ['super_admin', 'moderator', 'support_admin', 'analyst'].includes(role);
    default:
      return false;
  }
}

export function getAllowedSuperAdminEmails(): string[] {
  const envEmails = process.env.SUPER_ADMIN_EMAILS || '';
  return envEmails
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Extracts and verifies the admin session from an incoming NextRequest.
 * Looks for Authorization: Bearer <token> or standard Supabase auth cookie.
 */
export async function verifyAdminSession(req: NextRequest): Promise<AdminSession | null> {
  try {
    let token = '';

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }

    if (!token) {
      // Check cookies for sb-*-auth-token or access_token
      const allCookies = req.cookies.getAll();
      for (const cookie of allCookies) {
        if (cookie.name.includes('-auth-token') || cookie.name === 'supabase-auth-token') {
          try {
            const parsed = JSON.parse(decodeURIComponent(cookie.value));
            if (Array.isArray(parsed) && parsed[0]) {
              token = parsed[0];
              break;
            } else if (parsed?.access_token) {
              token = parsed.access_token;
              break;
            }
          } catch {
            if (cookie.value) {
              token = cookie.value;
              break;
            }
          }
        }
      }
    }

    if (!token) {
      return null;
    }

    const sbClient = createAdminScopedClient(token);
    const { data: { user }, error: authErr } = await sbClient.auth.getUser(token);

    if (authErr || !user) {
      return null;
    }

    // 1. Query admin_users table for explicitly authorized accounts
    const { data: adminRecord, error: adminErr } = await sbClient
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminRecord && !adminErr) {
      return {
        adminUser: {
          id: adminRecord.id,
          email: adminRecord.email,
          name: adminRecord.name || user.user_metadata?.name || 'Admin',
          role: adminRecord.role as AdminRole,
          is_active: adminRecord.is_active,
          created_at: adminRecord.created_at,
          updated_at: adminRecord.updated_at,
        },
        token,
        databaseAccess: true,
      };
    }

    // 2. Strict Whitelist Check from SUPER_ADMIN_EMAILS environment configuration
    const allowedEmails = getAllowedSuperAdminEmails();
    const userEmail = (user.email || '').toLowerCase().trim();

    if (userEmail && allowedEmails.includes(userEmail)) {
      const superAdminUser: AdminUser = {
        id: user.id,
        email: userEmail,
        name: user.user_metadata?.full_name || user.user_metadata?.name || 'Super Admin',
        role: 'super_admin',
        is_active: true,
      };

      // Row Level Security only lets an existing super admin add a row, so this normally
      // fails for a first admin. They need supabase/add_admins.sql.
      const { error: upsertError } = await sbClient.from('admin_users').upsert({
        id: superAdminUser.id,
        email: superAdminUser.email,
        name: superAdminUser.name,
        role: 'super_admin',
        is_active: true,
      });

      if (upsertError) {
        console.error(
          `Admin ${superAdminUser.email} has no admin_users row, so admin pages will be empty. Run supabase/add_admins.sql.`
        );
      }

      return {
        adminUser: superAdminUser,
        token,
        databaseAccess: !upsertError,
      };
    }

    // STRICT DENIAL: Not in admin_users and not in whitelist
    return null;
  } catch (error) {
    console.error('Error verifying admin session:', error);
    return null;
  }
}

/**
 * Records an immutable administrative audit log entry
 */
export async function logAdminAction(params: {
  adminUser: AdminUser;
  token?: string;
  action: string;
  targetType: string;
  targetId?: string;
  previousState?: any;
  newState?: any;
  reason?: string;
  ipAddress?: string;
}) {
  try {
    const client = params.token ? createAdminScopedClient(params.token) : getBaseClient();
    await client.from('admin_audit_logs').insert({
      admin_id: params.adminUser.id,
      admin_email: params.adminUser.email,
      admin_role: params.adminUser.role,
      action: params.action,
      target_type: params.targetType,
      target_id: params.targetId || null,
      previous_state: params.previousState ? params.previousState : null,
      new_state: params.newState ? params.newState : null,
      reason: params.reason || null,
      ip_address: params.ipAddress || null,
    });
  } catch (err) {
    console.warn('Could not record admin audit log to database:', err);
  }
}
