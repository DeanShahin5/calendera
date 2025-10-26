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
        events: [],
        note: 'Beeper database not initialized yet'
      });
    }

    // Get Beeper events with message details
    const query = `
      SELECT
        e.*,
        m.from_name,
        m.from_contact,
        m.platform
      FROM beeper_events e
      LEFT JOIN beeper_messages m ON e.message_id = m.id
      WHERE e.is_on_calendar = 0
      ORDER BY e.event_date ASC, e.event_time ASC
      LIMIT 50
    `;

    const events = await db.all(query);

    console.log(`[GET /api/beeper-events] Found ${events.length} Beeper events`);

    return NextResponse.json({
      success: true,
      events
    });
  } catch (error) {
    console.error('[GET /api/beeper-events] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch Beeper events',
      events: []
    });
  }
}
