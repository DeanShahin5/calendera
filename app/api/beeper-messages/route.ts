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

  console.log('[getBeeperDb] Database path:', dbPath);

  try {
    beeperDb = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    console.log('[getBeeperDb] Beeper database connected');
    return beeperDb;
  } catch (error) {
    console.log('[getBeeperDb] Beeper database not found or not initialized yet');
    return null;
  }
}

export async function GET() {
  try {
    const db = await getBeeperDb();

    // If database doesn't exist yet, return empty result gracefully
    if (!db) {
      return NextResponse.json({
        success: true,
        messages: [],
        note: 'Beeper database not initialized yet. Run beeper-index.js to start collecting messages.'
      });
    }

    // Get recent Beeper messages with their processed category
    const query = `
      SELECT
        m.*,
        pm.category,
        pm.urgency,
        pm.confidence
      FROM beeper_messages m
      LEFT JOIN beeper_processed_messages pm ON m.id = pm.message_id
      ORDER BY m.timestamp DESC
      LIMIT 50
    `;

    const messages = await db.all(query);

    console.log(`[GET /api/beeper-messages] Found ${messages.length} Beeper messages`);

    return NextResponse.json({
      success: true,
      messages
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
