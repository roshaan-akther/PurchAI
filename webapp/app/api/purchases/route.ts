import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, BrowserSessionPayload } from '@/lib/jwt';
import { cookies } from 'next/headers';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const payload = verifyToken<BrowserSessionPayload>(token);

    if (!payload || payload.typ !== 'browser') {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { items } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required and must not be empty' }, { status: 400 });
    }

    for (const item of items) {
      if (!item.product_id || typeof item.product_id !== 'string') {
        return NextResponse.json({ error: 'Each item must have a string product_id' }, { status: 400 });
      }
      if (!item.quantity || typeof item.quantity !== 'number' || item.quantity < 1) {
        return NextResponse.json({ error: 'Each item must have a positive integer quantity' }, { status: 400 });
      }
    }

    await dbConnect();

    const purchases = items.map((item: { product_id: string; quantity: number }) => ({
      product_id: item.product_id,
      timestamp: new Date(),
      quantity: item.quantity,
      event_type: 'purchase',
    }));

    const result = await User.findByIdAndUpdate(
      payload.uid,
      { $push: { purchase_history: { $each: purchases } } },
      { new: false }
    );

    if (!result) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Purchase recording failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : '';
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json({ error: 'Internal server error', details: errorMessage }, { status: 500 });
  }
}
