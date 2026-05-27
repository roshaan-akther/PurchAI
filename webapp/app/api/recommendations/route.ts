import { NextRequest, NextResponse } from 'next/server';

const RECOMMENDATION_API_URL = process.env.RECOMMENDATION_API_URL || 'http://localhost:8010';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || 'status';
    
    let url = `${RECOMMENDATION_API_URL}`;
    
    switch (endpoint) {
      case 'status':
        url += '/';
        break;
      case 'health':
        url += '/health';
        break;
      default:
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: `Recommendation API error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Recommendation API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to recommendation API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, ...requestData } = body;
    
    let url = `${RECOMMENDATION_API_URL}`;
    
    switch (endpoint) {
      case 'recommend':
        url += '/recommend';
        break;
      case 'new-user':
        url += '/recommend/new-user';
        break;
      case 'also-bought':
        url += '/recommend/also-bought';
        break;
      default:
        return NextResponse.json({ error: 'Invalid endpoint' }, { status: 400 });
    }
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestData),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: response.statusText }));
      return NextResponse.json(
        { error: errorData.detail || `Recommendation API error: ${response.statusText}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Recommendation API proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to connect to recommendation API' },
      { status: 500 }
    );
  }
}
