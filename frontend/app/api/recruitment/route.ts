import { NextResponse } from 'next/server';
import { getDb, MessageWithCategory } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    const messages = await db.all<MessageWithCategory[]>(`
      SELECT
        m.*,
        pm.category,
        pm.urgency,
        pm.confidence
      FROM messages m
      JOIN processed_messages pm ON m.id = pm.message_id
      WHERE pm.category = 'RECRUITMENT'
      ORDER BY m.timestamp DESC
      LIMIT 50
    `);

    return NextResponse.json({
      success: true,
      messages: messages.map(msg => ({
        ...msg,
        labels: msg.labels ? JSON.parse(msg.labels) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching recruitment messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch recruitment messages' },
      { status: 500 }
    );
  }
}
