import { NextResponse } from 'next/server';
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let beeperDb: Database | null = null;

async function getBeeperDb(): Promise<Database | null> {
  if (beeperDb) {
    return beeperDb;
  }

  const cwd = process.cwd();
  const dbPath = path.join(cwd, 'inbox-agents', 'beeper-messages.db');

  try {
    beeperDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('[getBeeperDb] Beeper database connected');
    return beeperDb;
  } catch (error) {
    console.log('[getBeeperDb] Beeper database not found');
    return null;
  }
}

export async function GET() {
  try {
    const db = await getBeeperDb();

    if (!db) {
      return NextResponse.json({
        success: true,
        todos: [],
        note: 'Beeper database not initialized yet'
      });
    }

    // Get Beeper todos with message details
    const query = `
      SELECT
        t.*,
        m.from_name,
        m.from_contact,
        m.platform
      FROM beeper_todos t
      LEFT JOIN beeper_messages m ON t.message_id = m.id
      ORDER BY
        CASE WHEN t.deadline IS NOT NULL THEN 0 ELSE 1 END,
        t.deadline ASC
      LIMIT 50
    `;

    const todos = await db.all(query);

    console.log(`[GET /api/beeper-todos] Found ${todos.length} Beeper todos`);

    return NextResponse.json({
      success: true,
      todos
    });
  } catch (error) {
    console.error('[GET /api/beeper-todos] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Beeper todos',
      todos: []
    });
  }
}
