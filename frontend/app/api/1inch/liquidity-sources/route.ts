import { NextRequest, NextResponse } from 'next/server';

const ONEINCH_API_KEY = process.env.NEXT_PUBLIC_ONEINCH_API_KEY || '';
const ONEINCH_BASE_URL = 'https://api.1inch.com';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainId = searchParams.get('chainId');
    
    if (!chainId) {
      return NextResponse.json(
        { error: 'chainId is required' },
        { status: 400 }
      );
    }

    const url = `${ONEINCH_BASE_URL}/swap/v6.1/${chainId}/liquidity-sources`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      return NextResponse.json(
        { error: error.description || error.error || `API Error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Liquidity sources proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch liquidity sources' },
      { status: 500 }
    );
  }
}

