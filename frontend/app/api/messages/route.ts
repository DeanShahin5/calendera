import { NextResponse } from 'next/server';
import { getDb, MessageWithCategory } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    const db = await getDb();

    let query = `
      SELECT
        m.*,
        pm.category,
        pm.urgency,
        pm.confidence
      FROM messages m
      LEFT JOIN processed_messages pm ON m.id = pm.message_id
      WHERE pm.category IS NOT NULL
    `;

    const params: string[] = [];

    if (category && category !== 'all') {
      query += ` AND pm.category = ?`;
      params.push(category.toUpperCase());
    }

    query += ` ORDER BY m.timestamp DESC LIMIT 100`;

    const messages = await db.all<MessageWithCategory[]>(query, params);

    return NextResponse.json({
      success: true,
      messages: messages.map(msg => ({
        ...msg,
        labels: msg.labels ? JSON.parse(msg.labels) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
