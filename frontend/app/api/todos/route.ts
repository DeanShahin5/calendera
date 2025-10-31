import { NextResponse } from 'next/server';
import { getDb, Todo } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    const todos = await db.all<Todo[]>(`
      SELECT
        t.*,
        m.subject,
        m.from_email,
        m.snippet
      FROM todos t
      JOIN messages m ON t.message_id = m.id
      ORDER BY
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          WHEN 'low' THEN 3
          ELSE 4
        END,
        t.deadline ASC
    `);

    return NextResponse.json({
      success: true,
      todos
    });
  } catch (error) {
    console.error('Error fetching todos:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch todos' },
      { status: 500 }
    );
  }
}
