import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function getGoogleAuth() {
  const tokenPath = path.join(process.cwd(), 'inbox-agents', 'token.json');
  const credentialsPath = path.join(process.cwd(), 'inbox-agents', 'credentials.json');

  if (!fs.existsSync(tokenPath) || !fs.existsSync(credentialsPath)) {
    throw new Error('Google credentials not found');
  }

  const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf-8'));
  const token = JSON.parse(fs.readFileSync(tokenPath, 'utf-8'));

  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);

  return oAuth2Client;
}

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get event details
    const event = await db.get(`
      SELECT * FROM events WHERE id = ?
    `, [eventId]);

    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    // If event is on Google Calendar, delete it from there first
    if (event.is_on_calendar && event.calendar_id) {
      try {
        const auth = await getGoogleAuth();
        const calendar = google.calendar({ version: 'v3', auth });

        await calendar.events.delete({
          calendarId: 'primary',
          eventId: event.calendar_id,
        });

        console.log('Deleted event from Google Calendar:', event.calendar_id);
      } catch (calendarError: any) {
        console.error('Error deleting from Google Calendar:', calendarError);
        // Continue with database deletion even if calendar deletion fails
        // (calendar event might already be deleted)
      }
    }

    // Delete event from database
    await db.run(
      `DELETE FROM events WHERE id = ?`,
      [eventId]
    );

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}
