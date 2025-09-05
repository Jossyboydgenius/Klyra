import { NextRequest, NextResponse } from 'next/server';
import { adminAuthService } from '@/lib/auth/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { valid: false, error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const result = await adminAuthService.verifyToken(token);

    if (result.valid) {
      return NextResponse.json({
        valid: true,
        email: result.email
      });
    } else {
      return NextResponse.json(
        { valid: false, error: result.error },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Token verification API error:', error);
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
