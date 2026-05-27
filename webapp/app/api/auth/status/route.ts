import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, BrowserSessionPayload } from '@/lib/jwt';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false });
    }

    const payload = verifyToken<BrowserSessionPayload>(token);

    if (!payload || payload.typ !== 'browser') {
      return NextResponse.json({ authenticated: false });
    }

    await dbConnect();

    // Check if session exists and is not revoked
    const session = await Session.findOne({ id: payload.sid });

    if (!session || session.revoked) {
      return NextResponse.json({ authenticated: false });
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.json({ authenticated: false });
    }

    return NextResponse.json({
      authenticated: true,
      userId: payload.uid,
      sessionId: payload.sid,
    });
  } catch (error) {
    console.error('Auth status check failed:', error);
    return NextResponse.json({ authenticated: false });
  }
}
