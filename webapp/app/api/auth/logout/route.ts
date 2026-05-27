import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, BrowserSessionPayload } from '@/lib/jwt';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'No session found' }, { status: 401 });
    }

    const payload = verifyToken<BrowserSessionPayload>(token);

    if (!payload || payload.typ !== 'browser') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    await dbConnect();

    // Revoke session in database
    await Session.findOneAndUpdate(
      { id: payload.sid },
      { revoked: true }
    );

    // Clear the auth_token cookie
    const response = NextResponse.json({ success: true });
    response.cookies.delete('auth_token');

    return response;
  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
