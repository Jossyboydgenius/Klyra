import { NextRequest, NextResponse } from 'next/server';
import { sendSms } from '@/lib/moolre/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      recipient,
      message,
      senderId,
      ref,
    }: { recipient?: string; message?: string; senderId?: string; ref?: string } =
      body ?? {};

    if (!recipient || !message) {
      return NextResponse.json(
        {
          success: false,
          error: 'Recipient and message are required to send SMS.',
        },
        { status: 400 },
      );
    }

    const result = await sendSms({
      senderId,
      messages: [{ recipient, message, ref }],
    });

    return NextResponse.json({
      success: result.status === 1,
      data: result,
    });
  } catch (error) {
    console.error('Moolre SMS error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SMS dispatch failed. Please try again later.',
      },
      { status: 500 },
    );
  }
}

