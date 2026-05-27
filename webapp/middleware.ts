import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken, BrowserSessionPayload } from '@/lib/jwt';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import Session from '@/models/Session';

// Runtime must be Node.js for JWT crypto operations
export const runtime = 'nodejs';

// Protected paths - add paths that require authentication
const PROTECTED_PATHS = ['/chat', '/thread', '/history', '/settings'];

// Static paths that don't require auth
const STATIC_PATHS = ['/_next/static', '/favicon.ico', '/favicons', '/robots.txt'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static assets
  if (STATIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check if path is protected
  const isProtected = PROTECTED_PATHS.some(path => pathname.startsWith(path));

  if (!isProtected) {
    return NextResponse.next();
  }

  // Extract auth_token cookie
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    // Redirect to local login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify JWT token
  const payload = verifyToken<BrowserSessionPayload>(token);

  if (!payload || payload.typ !== 'browser') {
    // Invalid token, redirect to local login page
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if session exists and is valid in database
  try {
    await dbConnect();
    
    const session = await Session.findOne({ id: payload.sid });

    if (!session || session.revoked) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check if session is expired
    if (new Date(session.expires_at) < new Date()) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  } catch (error) {
    console.error('Database check failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Add user info to headers for downstream use
  const response = NextResponse.next();
  response.headers.set('X-User-Id', payload.uid);
  response.headers.set('X-Session-Id', payload.sid);

  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
