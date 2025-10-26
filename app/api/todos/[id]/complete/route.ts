import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { completed } = body;
    const db = await getDb();

    // Support toggling: if completed is provided, use it; otherwise default to 1
    const completedValue = completed !== undefined ? completed : 1;

    await db.run(
      `UPDATE todos
       SET completed = ?, completed_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [completedValue, id]
    );

    return NextResponse.json({
      success: true,
      message: completedValue === 1 ? 'Todo marked as complete' : 'Todo marked as incomplete'
    });
  } catch (error) {
    console.error('Error completing todo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update todo' },
      { status: 500 }
    );
  }
}
