import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Session from '@/models/Session';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await dbConnect();

    // Get user from database
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Check if account is locked
    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      return NextResponse.json({ error: 'Account is locked. Please try again later.' }, { status: 403 });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      // Increment failed login attempts
      const failedAttempts = user.failed_login_attempts + 1;
      const updateData: any = { failed_login_attempts: failedAttempts };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        updateData.locked_until = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }

      await User.findByIdAndUpdate(user._id, updateData);

      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Reset failed login attempts on successful login
    await User.findByIdAndUpdate(user._id, {
      failed_login_attempts: 0,
      locked_until: null,
    });

    // Create browser session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const userAgent = request.headers.get('user-agent') || null;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;

    await Session.create({
      id: sessionId,
      user_id: user._id.toString(),
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ipAddress,
      revoked: false,
    });

    // Sign JWT token
    const token = signToken({
      sid: sessionId,
      uid: user._id.toString(),
      typ: 'browser',
    });

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        email_verified: user.email_verified,
        roles: user.roles,
      },
    });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
