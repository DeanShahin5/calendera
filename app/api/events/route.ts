import { NextResponse } from 'next/server';
import { getDb, Event } from '@/lib/db';

export async function GET() {
  try {
    const db = await getDb();

    const events = await db.all<Event[]>(`
      SELECT
        e.*,
        m.subject,
        m.from_email,
        m.snippet
      FROM events e
      JOIN messages m ON e.message_id = m.id
      ORDER BY e.event_date ASC, e.event_time ASC
    `);

    return NextResponse.json({
      success: true,
      events: events.map(event => ({
        ...event,
        attendees: event.attendees ? JSON.parse(event.attendees) : []
      }))
    });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}
