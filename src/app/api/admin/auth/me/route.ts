import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyAdminSession(request);
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin privileges required.' },
        { status: 401 }
      );
    }

    return NextResponse.json({
      adminUser: session.adminUser,
      authenticated: true,
      databaseAccess: session.databaseAccess,
    });
  } catch (error: any) {
    console.error('Error checking admin auth:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
