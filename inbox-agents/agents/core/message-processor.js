const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');
const Database = require('../../database');

class MessageProcessorAgent {
  constructor() {
    this.anthropic = null;
    this.db = new Database();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Message Processor Agent...');

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

      logger.info('Message Processor Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Message Processor Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Process unprocessed messages
   */
  async processMessages() {
    try {
      logger.info('Fetching unprocessed messages...');

      const messages = await this.db.getUnprocessedMessages();
      logger.info(`Found ${messages.length} unprocessed messages`);

      if (messages.length === 0) {
        return {
          processed: 0,
          events: 0,
          todos: 0
        };
      }

      let processedCount = 0;
      let eventsCount = 0;
      let todosCount = 0;

      for (const message of messages) {
        try {
          logger.info(`Processing message: ${message.subject}`);

          const result = await this.analyzeMessage(message);

          // Save processed message
          await this.db.markAsProcessed(
            message.id,
            result.category,
            result.urgency,
            result.confidence
          );

          processedCount++;

          // If EVENT, save event details
          if (result.category === 'EVENT' && result.eventDetails) {
            await this.db.insertEvent({
              messageId: message.id,
              title: result.eventDetails.title || message.subject,
              date: result.eventDetails.date,
              time: result.eventDetails.time,
              location: result.eventDetails.location,
              attendees: result.eventDetails.attendees || [],
              isOnCalendar: false
            });
            eventsCount++;
            logger.info(`Extracted event from message: ${message.subject}`);
          }

          // If TODO, save todo details
          if (result.category === 'TODO' && result.todoDetails) {
            await this.db.insertTodo({
              messageId: message.id,
              task: result.todoDetails.task || message.subject,
              deadline: result.todoDetails.deadline,
              priority: result.todoDetails.priority
            });
            todosCount++;
            logger.info(`Extracted todo from message: ${message.subject}`);
          }

          logger.info(`Processed message ${message.id} as ${result.category} with ${result.urgency} urgency`);
        } catch (error) {
          logger.error(`Failed to process message ${message.id} - will retry on next run`, {
            messageId: message.id,
            subject: message.subject,
            error: error.message,
            stack: error.stack
          });
        }
      }

      return {
        processed: processedCount,
        events: eventsCount,
        todos: todosCount
      };
    } catch (error) {
      logger.error('Error in processMessages', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze a message using Claude API
   */
  async analyzeMessage(message) {
    const prompt = this.buildPrompt(message);

    const response = await this.anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
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
    
    const analysis = JSON.parse(cleanedText);

    logger.debug('Claude analysis', {
      messageId: message.id,
      category: analysis.category,
      urgency: analysis.urgency,
      confidence: analysis.confidence
    });

    return analysis;
  }

  /**
   * Build prompt for Claude API
   */
  buildPrompt(message) {
    return `You are an email categorization and information extraction AI. Analyze the following email and extract relevant information.

Email Details:
From: ${message.from_email}
To: ${message.to_email}
Subject: ${message.subject}
Date: ${message.date}
Body:
${message.body}

Please categorize this email into ONE of the following categories:
- EVENT: Invitations, meetings, appointments, scheduled events
- TODO: Action items, tasks, deadlines, things that require doing
- SOCIAL: Personal messages, social updates, casual communications
- SPAM: Unwanted marketing, promotional content, spam
- RECRUITMENT: Job opportunities, recruitment messages, career-related
- FINANCIAL: Bills, payments, invoices, financial statements
- URGENT: Time-sensitive matters requiring immediate attention
- INFORMATIONAL: News, updates, general information

For each email, provide:
1. category: One of the categories above
2. urgency: "low", "medium", or "high"
3. confidence: A score from 0.0 to 1.0 indicating how confident you are in the classification

If the category is EVENT, also extract:
- eventDetails:
  - title: Event name/title
  - date: Event date (YYYY-MM-DD format, or null if not found)
  - time: Event time (HH:MM format, or null if not found)
  - location: Event location (string or null)
  - attendees: Array of attendee email addresses (or empty array)

If the category is TODO, also extract:
- todoDetails:
  - task: Description of the task
  - deadline: Deadline date/time (YYYY-MM-DD format, or null if not found)
  - priority: "low", "medium", or "high"

Return ONLY a valid JSON object with no additional text. Example format:
{
  "category": "EVENT",
  "urgency": "medium",
  "confidence": 0.95,
  "eventDetails": {
    "title": "Team Meeting",
    "date": "2024-03-15",
    "time": "14:00",
    "location": "Conference Room A",
    "attendees": ["john@example.com", "jane@example.com"]
  },
  "todoDetails": null
}

Or for a TODO:
{
  "category": "TODO",
  "urgency": "high",
  "confidence": 0.88,
  "eventDetails": null,
  "todoDetails": {
    "task": "Submit quarterly report",
    "deadline": "2024-03-20",
    "priority": "high"
  }
}`;
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

module.exports = MessageProcessorAgent;