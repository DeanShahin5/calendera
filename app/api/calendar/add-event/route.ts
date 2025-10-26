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

    // Check if already added to calendar
    if (event.is_on_calendar) {
      return NextResponse.json({
        success: true,
        message: 'Event already on calendar',
        calendarId: event.calendar_id
      });
    }

    // Get Google Calendar API
    try {
      const auth = await getGoogleAuth();
      const calendar = google.calendar({ version: 'v3', auth });

      // Parse attendees
      const attendees = event.attendees ? JSON.parse(event.attendees) : [];

      // Create calendar event
      const startDateTime = `${event.event_date}T${event.event_time || '09:00'}:00`;
      const endDateTime = `${event.event_date}T${event.event_time ?
        (parseInt(event.event_time.split(':')[0]) + 1).toString().padStart(2, '0') + ':' + event.event_time.split(':')[1]
        : '10:00'}:00`;

      const calendarEvent = {
        summary: event.title,
        location: event.location || '',
        start: {
          dateTime: startDateTime,
          timeZone: 'America/Los_Angeles',
        },
        end: {
          dateTime: endDateTime,
          timeZone: 'America/Los_Angeles',
        },
        attendees: attendees.map((email: string) => ({ email })),
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: calendarEvent,
      });

      // Update database
      await db.run(
        `UPDATE events
         SET is_on_calendar = 1, calendar_id = ?
         WHERE id = ?`,
        [response.data.id, eventId]
      );

      return NextResponse.json({
        success: true,
        message: 'Event added to calendar',
        calendarId: response.data.id,
        htmlLink: response.data.htmlLink
      });
    } catch (authError: any) {
      console.error('Calendar authentication error:', authError);

      // Specific error handling
      if (authError.code === 403 || authError.message?.includes('scopes')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Calendar access not configured. Please delete inbox-agents/token.json and re-run the inbox-agents to re-authenticate with calendar permissions.'
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: `Calendar API error: ${authError.message || 'Unknown error'}`
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error adding event to calendar:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to add event to calendar' },
      { status: 500 }
    );
  }
}
