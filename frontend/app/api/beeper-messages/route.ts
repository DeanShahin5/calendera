import { NextResponse } from 'next/server';
import { mockBeeperMessages } from '@/lib/mockBeeperData';

export async function GET() {
  try {
    console.log(`[GET /api/beeper-messages] Returning ${mockBeeperMessages.length} mock messages for demo`);

    return NextResponse.json({
      success: true,
      messages: mockBeeperMessages,
      note: '🎭 Demo mode: Showing mock Beeper messages'
    });
  } catch (error) {
    console.error('[GET /api/beeper-messages] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Beeper messages',
      messages: []
    });
  }
}
