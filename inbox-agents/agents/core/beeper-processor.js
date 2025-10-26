const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../../utils/logger');
const BeeperDatabase = require('../../beeper-database');

class BeeperMessageProcessor {
  constructor() {
    this.anthropic = null;
    this.db = new BeeperDatabase();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Beeper Message Processor...');

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

      logger.info('Beeper Message Processor initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Beeper Message Processor', { error: error.message });
      throw error;
    }
  }

  /**
   * Process unprocessed messages
   */
  async processMessages() {
    try {
      logger.info('Fetching unprocessed Beeper messages...');

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
          logger.info(`Processing message from ${message.from_name} on ${message.platform}`);

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
              title: result.eventDetails.title || `Event from ${message.from_name}`,
              date: result.eventDetails.date,
              time: result.eventDetails.time,
              location: result.eventDetails.location,
              attendees: result.eventDetails.attendees || [],
              isOnCalendar: false
            });
            eventsCount++;
            logger.info(`Extracted event from message: ${result.eventDetails.title}`);
          }

          // If TODO, save todo details
          if (result.category === 'TODO' && result.todoDetails) {
            await this.db.insertTodo({
              messageId: message.id,
              task: result.todoDetails.task || message.body,
              deadline: result.todoDetails.deadline,
              priority: result.todoDetails.priority
            });
            todosCount++;
            logger.info(`Extracted todo from message: ${result.todoDetails.task}`);
          }

          logger.info(`Processed message ${message.id} as ${result.category} with ${result.urgency} urgency`);
        } catch (error) {
          logger.error(`Failed to process message ${message.id} - will retry on next run`, {
            messageId: message.id,
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
    return `You are a message categorization and information extraction AI for multi-platform chat messages (iMessage, WhatsApp, Telegram, Signal, Slack, etc.). Analyze the following message and extract relevant information.

Message Details:
Platform: ${message.platform}
From: ${message.from_name} (${message.from_contact})
Room: ${message.room_name || 'Direct Message'}
Date: ${message.date}
Is Group: ${message.is_group_message}
Body:
${message.body}

Please categorize this message into ONE of the following categories:
- EVENT: Meeting invitations, appointments, scheduled hangouts, "let's meet at..."
- TODO: Action items, tasks, requests, "can you...", "don't forget to..."
- SOCIAL: Personal messages, casual conversations, life updates, catching up
- SPAM: Unwanted messages, promotional content, spam, scams
- RECRUITMENT: Job opportunities, recruitment messages, career-related
- FINANCIAL: Payment requests, bills, money-related discussions
- URGENT: Time-sensitive matters requiring immediate attention
- INFORMATIONAL: News, updates, general information sharing

For each message, provide:
1. category: One of the categories above
2. urgency: "low", "medium", or "high"
3. confidence: A score from 0.0 to 1.0 indicating how confident you are in the classification

If the category is EVENT, also extract:
- eventDetails:
  - title: Event name/title
  - date: Event date (YYYY-MM-DD format, or null if not found)
  - time: Event time (HH:MM format, or null if not found)
  - location: Event location (string or null)
  - attendees: Array of participant names (or empty array)

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
    "title": "Coffee meetup",
    "date": "2024-03-15",
    "time": "14:00",
    "location": "Starbucks downtown",
    "attendees": ["John", "Sarah"]
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
    "task": "Send the project files",
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

module.exports = BeeperMessageProcessor;
