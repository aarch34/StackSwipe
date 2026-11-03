import { NextRequest, NextResponse } from 'next/server';
import {
  getBaseClient,
  createAdminScopedClient,
  getAllowedSuperAdminEmails,
} from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const sb = getBaseClient();

    // 1. Attempt Supabase Auth login
    const { data: authData, error: authError } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.session) {
      // If error is "Email not confirmed", provide a clear message
      if (authError?.message?.includes('not confirmed')) {
        return NextResponse.json(
          {
            error:
              'Email not confirmed in Supabase. Please confirm your email in Supabase dashboard or SQL editor.',
            needsConfirmation: true,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        { error: authError?.message || 'Invalid administrator credentials' },
        { status: 401 }
      );
    }

    const token = authData.session.access_token;
    const user = authData.user;

    // 2. Check admin_users table
    const scopedClient = createAdminScopedClient(token);
    const { data: adminRecord } = await scopedClient
      .from('admin_users')
      .select('*')
      .eq('id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (adminRecord) {
      return NextResponse.json({
        success: true,
        session: authData.session,
        adminUser: adminRecord,
      });
    }

    // 3. Strict Whitelist Check from SUPER_ADMIN_EMAILS
    const allowedEmails = getAllowedSuperAdminEmails();
    const userEmail = (user.email || '').toLowerCase().trim();

    if (userEmail && allowedEmails.includes(userEmail)) {
      const superAdminUser = {
        id: user.id,
        email: userEmail,
        name: user.user_metadata?.full_name || 'Super Admin',
        role: 'super_admin' as const,
        is_active: true,
      };

      try {
        await scopedClient.from('admin_users').upsert(superAdminUser);
      } catch (e) {
        // Table might be pending migration
      }

      return NextResponse.json({
        success: true,
        session: authData.session,
        adminUser: superAdminUser,
      });
    }

    return NextResponse.json(
      {
        error:
          'Access Denied: The email ' + userEmail + ' is not authorized for administrative access.',
      },
      { status: 403 }
    );
  } catch (error: any) {
    console.error('Error in admin login route:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
