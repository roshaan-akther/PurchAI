import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/jwt';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Session from '@/models/Session';
import { generateUserId } from '@/lib/user-id-generator';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    await dbConnect();

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    // Generate auto-incrementing user ID
    const userId = await generateUserId();

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user with custom ID
    const user = await User.create({
      _id: userId,
      email: email.toLowerCase(),
      password_hash: passwordHash,
      email_verified: false,
      roles: ['user'],
    });

    // Create browser session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    const userAgent = request.headers.get('user-agent') || null;
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || null;

    await Session.create({
      id: sessionId,
      user_id: user._id,
      expires_at: expiresAt,
      user_agent: userAgent,
      ip_address: ipAddress,
      revoked: false,
    });

    // Sign JWT token
    const token = signToken({
      sid: sessionId,
      uid: user._id,
      typ: 'browser',
    });

    // Set cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id,
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
    console.error('Registration failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
