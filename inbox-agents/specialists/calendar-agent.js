const Anthropic = require('@anthropic-ai/sdk');
const { google } = require('googleapis');
const logger = require('../../utils/logger');
const Database = require('../../database');
const { authorize } = require('../../config/gmail-setup');

class CalendarAgent {
  constructor() {
    this.anthropic = null;
    this.calendar = null;
    this.db = new Database();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Calendar Agent...');

      // Initialize database
      await this.db.initialize();

      // Initialize Anthropic client
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is not set');
      }

      this.anthropic = new Anthropic({
        apiKey: apiKey,
      });

      // Initialize Google Calendar client
      try {
        const auth = await authorize();
        this.calendar = google.calendar({ version: 'v3', auth });
        logger.info('Google Calendar API initialized');
      } catch (error) {
        logger.warn('Could not initialize Google Calendar API', { error: error.message });
        logger.warn('Calendar checking will be disabled');
      }

      logger.info('Calendar Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Calendar Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Process a message and extract calendar event information
   * @param {Object} message - Processed message object
   * @returns {Object} Extracted event data with confidence scores
   */
  async extractEvent(message) {
    try {
      logger.info(`Extracting calendar event from message: ${message.subject}`);

      // Build specialized prompt for calendar extraction
      const prompt = this.buildCalendarPrompt(message);

      // Call Claude API
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-5-20250929',
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const analysisText = response.content[0].text;
      
      // Strip markdown code blocks if present
      let cleanedText = analysisText.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\s*\n/, '').replace(/\n```\s*$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\s*\n/, '').replace(/\n```\s*$/, '');
      }
      
      const eventData = JSON.parse(cleanedText);

      // Check if event already exists in calendar
      if (this.calendar && eventData.hasEvent && eventData.event) {
        const existsInCalendar = await this.checkEventExistsInCalendar(eventData.event);
        eventData.event.existsInCalendar = existsInCalendar;
      } else if (eventData.event) {
        eventData.event.existsInCalendar = false;
      }

      logger.info('Event extraction complete', {
        messageId: message.id,
        hasEvent: eventData.hasEvent,
        confidence: eventData.confidence,
        existsInCalendar: eventData.event ? eventData.event.existsInCalendar : false
      });

      return eventData;
    } catch (error) {
      logger.error('Failed to extract event from message', {
        messageId: message.id,
        subject: message.subject,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Build specialized prompt for calendar event extraction
   */
  buildCalendarPrompt(message) {
    return `You are a specialized calendar event extraction AI. Your task is to analyze an email and extract detailed calendar event information.

Email Details:
From: ${message.from_email}
To: ${message.to_email}
Subject: ${message.subject}
Date: ${message.date}
Body:
${message.body}

Your task is to:
1. Determine if this email contains a calendar event (meeting, appointment, scheduled call, etc.)
2. If yes, extract ALL relevant event details with high precision
3. Assign confidence scores to each extracted field

Extract the following information:
- **Event Name**: The title/name of the event
- **Date**: Event date in YYYY-MM-DD format
- **Time**: Start time in HH:MM format (24-hour)
- **End Time**: End time in HH:MM format (24-hour) if available
- **Location**: Physical location, address, or "Virtual" for online meetings
- **Attendees**: List of email addresses of attendees
- **Meeting Link**: Any video conference links (Zoom, Google Meet, Teams, etc.)
- **Description**: Brief description or agenda if provided
- **Organizer**: Email address of the event organizer

IMPORTANT:
- If a field cannot be determined, set it to null
- Be careful with date/time parsing - consider timezones mentioned in the email
- Look for common patterns: "scheduled for", "meeting on", "appointment at", etc.
- Extract meeting links from the body (look for zoom.us, meet.google.com, teams.microsoft.com, etc.)
- Confidence scores should be between 0.0 and 1.0

Return ONLY a valid JSON object with no additional text. Format:
{
  "hasEvent": true,
  "confidence": 0.95,
  "event": {
    "name": "Team Standup Meeting",
    "date": "2024-03-15",
    "startTime": "10:00",
    "endTime": "10:30",
    "location": "Virtual",
    "attendees": ["john@example.com", "jane@example.com"],
    "meetingLink": "https://zoom.us/j/123456789",
    "description": "Daily team sync",
    "organizer": "manager@example.com",
    "confidenceScores": {
      "name": 1.0,
      "date": 0.95,
      "time": 0.90,
      "location": 0.85,
      "attendees": 0.80
    }
  }
}

If no event is found:
{
  "hasEvent": false,
  "confidence": 0.95,
  "event": null
}`;
  }

  /**
   * Check if an event already exists in the user's Google Calendar
   * @param {Object} event - Event object to check
   * @returns {Boolean} True if event exists in calendar
   */
  async checkEventExistsInCalendar(event) {
    if (!this.calendar || !event.date) {
      return false;
    }

    try {
      logger.debug('Checking if event exists in calendar', {
        name: event.name,
        date: event.date
      });

      // Calculate time range to search (the event date)
      const eventDate = new Date(event.date);
      const timeMin = new Date(eventDate);
      timeMin.setHours(0, 0, 0, 0);
      
      const timeMax = new Date(eventDate);
      timeMax.setHours(23, 59, 59, 999);

      // Search for events on that day
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items || [];

      // Check if any event matches
      for (const calEvent of events) {
        // Match by name (case-insensitive, partial match)
        const calEventName = (calEvent.summary || '').toLowerCase();
        const searchName = (event.name || '').toLowerCase();
        
        if (calEventName.includes(searchName) || searchName.includes(calEventName)) {
          logger.info('Found matching event in calendar', {
            calendarEventId: calEvent.id,
            calendarEventName: calEvent.summary
          });
          return true;
        }

        // Also check by time if available
        if (event.startTime && calEvent.start && calEvent.start.dateTime) {
          const calEventTime = new Date(calEvent.start.dateTime);
          const eventTime = `${calEventTime.getHours().toString().padStart(2, '0')}:${calEventTime.getMinutes().toString().padStart(2, '0')}`;
          
          if (eventTime === event.startTime && calEventName.includes(searchName.split(' ')[0])) {
            logger.info('Found matching event by time in calendar', {
              calendarEventId: calEvent.id,
              calendarEventName: calEvent.summary
            });
            return true;
          }
        }
      }

      logger.debug('No matching event found in calendar');
      return false;
    } catch (error) {
      logger.error('Error checking calendar', {
        error: error.message,
        eventName: event.name
      });
      return false;
    }
  }

  /**
   * Process all unprocessed EVENT category messages
   * @returns {Object} Processing results
   */
  async processEventMessages() {
    try {
      logger.info('Processing event messages...');

      // Get all processed messages with EVENT category that haven't been analyzed by calendar agent
      const messages = await this.db.all(`
        SELECT m.*, pm.category, pm.confidence as category_confidence
        FROM messages m
        JOIN processed_messages pm ON m.id = pm.message_id
        LEFT JOIN events e ON m.id = e.message_id
        WHERE pm.category = 'EVENT' AND e.id IS NULL
        ORDER BY m.timestamp DESC
        LIMIT 50
      `);

      logger.info(`Found ${messages.length} event messages to process`);

      let processedCount = 0;
      let eventsExtracted = 0;

      for (const message of messages) {
        try {
          const result = await this.extractEvent(message);

          if (result.hasEvent && result.event) {
            // Save event to database
            await this.db.insertEvent({
              messageId: message.id,
              title: result.event.name || message.subject,
              date: result.event.date,
              time: result.event.startTime,
              location: result.event.location,
              attendees: result.event.attendees || [],
              isOnCalendar: result.event.existsInCalendar
            });

            eventsExtracted++;
            logger.info(`Extracted and saved event: ${result.event.name}`);
          }

          processedCount++;
        } catch (error) {
          logger.error(`Failed to process event message ${message.id}`, {
            messageId: message.id,
            subject: message.subject,
            error: error.message
          });
        }
      }

      return {
        processed: processedCount,
        eventsExtracted: eventsExtracted
      };
    } catch (error) {
      logger.error('Error in processEventMessages', { error: error.message });
      throw error;
    }
  }

  /**
   * Cleanup
   */
  async cleanup() {
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = CalendarAgent;