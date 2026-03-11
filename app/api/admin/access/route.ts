import { NextResponse } from 'next/server';
import { getAdminAccess } from '@/app/lib/admin-access';

export async function GET() {
  const access = await getAdminAccess();

  if (access.ok) {
    return NextResponse.json(
      {
        canAccess: true,
        authenticated: true,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  if (access.status === 401) {
    return NextResponse.json(
      {
        canAccess: false,
        authenticated: false,
      },
      {
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }

  return NextResponse.json(
    {
      canAccess: false,
      authenticated: true,
      reason: access.error,
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    }
  );
}
