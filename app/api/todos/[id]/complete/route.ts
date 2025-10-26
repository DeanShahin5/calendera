import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDb();

    await db.run(
      `UPDATE todos
       SET completed = 1, completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Todo marked as complete'
    });
  } catch (error) {
    console.error('Error completing todo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to complete todo' },
      { status: 500 }
    );
  }
}
