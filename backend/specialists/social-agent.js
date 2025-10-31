const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const Database = require('../database');

class SocialAgent {
  constructor() {
    this.anthropic = null;
    this.db = new Database();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Social Agent...');

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

      logger.info('Social Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Social Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Process a message and extract social/relationship information
   * @param {Object} message - Processed message object
   * @returns {Object} Extracted social data with confidence scores
   */
  async analyzeSocialContext(message) {
    try {
      logger.info(`Analyzing social context for message: ${message.subject}`);

      // Build specialized prompt for social analysis
      const prompt = this.buildSocialPrompt(message);

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
      
      const socialData = JSON.parse(cleanedText);

      logger.info('Social analysis complete', {
        messageId: message.id,
        relationshipType: socialData.relationshipType,
        sentiment: socialData.sentiment,
        requiresResponse: socialData.requiresResponse,
        confidence: socialData.confidence
      });

      return socialData;
    } catch (error) {
      logger.error('Failed to analyze social context', {
        messageId: message.id,
        subject: message.subject,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Build specialized prompt for social/relationship analysis
   */
  buildSocialPrompt(message) {
    return `You are a specialized social relationship and communication analysis AI. Your task is to analyze an email and extract social context, relationship information, and interaction patterns.

Email Details:
From: ${message.from_email}
To: ${message.to_email}
Subject: ${message.subject}
Date: ${message.date}
Body:
${message.body}

Your task is to:
1. Determine the relationship type between sender and recipient
2. Identify the communication purpose and context
3. Detect important life events or milestones mentioned
4. Assess sentiment and tone
5. Identify if a response is expected or needed
6. Extract follow-up opportunities

Analyze and extract:

**Relationship Type** (choose one):
- family
- close_friend
- friend
- colleague
- professional_contact
- acquaintance
- community
- other

**Communication Purpose** (can be multiple):
- catch_up: General life updates, staying in touch
- life_event: Birthday, wedding, baby, graduation, etc.
- invitation: Social gathering, party, event
- thank_you: Expressing gratitude
- congratulations: Celebrating achievement
- condolences: Sympathy or support
- favor_request: Asking for help
- sharing: Sharing news, photos, articles
- planning: Making plans together
- other

**Life Events Mentioned** (extract all):
- Type: birthday, wedding, baby, graduation, promotion, moving, etc.
- Person: Who it's about
- Date: When (if mentioned)
- Details: Brief description

**Sentiment Analysis**:
- Overall tone: positive, neutral, negative, mixed
- Emotional indicators: happy, excited, sad, worried, grateful, etc.
- Formality level: casual, semi-formal, formal

**Response Analysis**:
- Requires response: true/false
- Response urgency: none, low, medium, high
- Suggested response type: reply, acknowledge, schedule_call, send_gift, etc.
- Response deadline: Date if time-sensitive

**Follow-up Opportunities**:
- Schedule meetup
- Send birthday/anniversary reminder
- Check in later
- Share information
- Other

**Key Topics**: Main subjects discussed (array of strings)

**Important Dates**: Any dates mentioned that should be remembered

Return ONLY a valid JSON object with no additional text. Format:

{
  "isSocial": true,
  "confidence": 0.93,
  "relationshipType": "close_friend",
  "communicationPurpose": ["catch_up", "life_event"],
  "lifeEvents": [
    {
      "type": "baby",
      "person": "Sarah",
      "date": "2024-04-15",
      "details": "Sarah had a baby girl named Emma"
    }
  ],
  "sentiment": {
    "tone": "positive",
    "emotions": ["happy", "excited"],
    "formalityLevel": "casual"
  },
  "responseAnalysis": {
    "requiresResponse": true,
    "urgency": "medium",
    "suggestedType": "reply",
    "deadline": null
  },
  "followUpOpportunities": [
    "Send congratulations gift",
    "Schedule visit to meet baby"
  ],
  "keyTopics": ["new baby", "parenting", "family updates"],
  "importantDates": [
    {
      "date": "2024-04-15",
      "description": "Emma's birthday"
    }
  ]
}

If not a social message:
{
  "isSocial": false,
  "confidence": 0.88,
  "relationshipType": null,
  "communicationPurpose": [],
  "lifeEvents": [],
  "sentiment": null,
  "responseAnalysis": null,
  "followUpOpportunities": [],
  "keyTopics": [],
  "importantDates": []
}`;
  }

  /**
   * Process all unprocessed SOCIAL category messages
   * @returns {Object} Processing results
   */
  async processSocialMessages() {
    try {
      logger.info('Processing SOCIAL messages...');

      // Get all processed messages with SOCIAL category that haven't been analyzed by social agent
      const messages = await this.db.all(`
        SELECT m.*, pm.category, pm.confidence as category_confidence
        FROM messages m
        JOIN processed_messages pm ON m.id = pm.message_id
        WHERE pm.category = 'SOCIAL'
        ORDER BY m.timestamp DESC
        LIMIT 50
      `);

      logger.info(`Found ${messages.length} SOCIAL messages to process`);

      let processedCount = 0;
      let socialInteractionsTracked = 0;

      for (const message of messages) {
        try {
          const result = await this.analyzeSocialContext(message);

          if (result.isSocial) {
            // Store social interaction data
            await this.storeSocialInteraction(message, result);
            socialInteractionsTracked++;
            
            logger.info(`Tracked social interaction from ${message.from_email}`, {
              relationshipType: result.relationshipType,
              purpose: result.communicationPurpose
            });
          }

          processedCount++;
        } catch (error) {
          logger.error(`Failed to process SOCIAL message ${message.id}`, {
            messageId: message.id,
            subject: message.subject,
            error: error.message
          });
        }
      }

      return {
        processed: processedCount,
        socialInteractionsTracked: socialInteractionsTracked
      };
    } catch (error) {
      logger.error('Error in processSocialMessages', { error: error.message });
      throw error;
    }
  }

  /**
   * Store social interaction data in database
   */
  async storeSocialInteraction(message, socialData) {
    try {
      // Create social_interactions table if it doesn't exist
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS social_interactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id TEXT,
          from_email TEXT,
          relationship_type TEXT,
          communication_purpose TEXT,
          sentiment_tone TEXT,
          requires_response BOOLEAN,
          response_urgency TEXT,
          life_events TEXT,
          important_dates TEXT,
          key_topics TEXT,
          follow_up_opportunities TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages(id)
        )
      `);

      // Insert social interaction
      await this.db.run(`
        INSERT INTO social_interactions (
          message_id, from_email, relationship_type, communication_purpose,
          sentiment_tone, requires_response, response_urgency,
          life_events, important_dates, key_topics, follow_up_opportunities
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        message.from_email,
        socialData.relationshipType,
        JSON.stringify(socialData.communicationPurpose),
        socialData.sentiment ? socialData.sentiment.tone : null,
        socialData.responseAnalysis ? socialData.responseAnalysis.requiresResponse : false,
        socialData.responseAnalysis ? socialData.responseAnalysis.urgency : null,
        JSON.stringify(socialData.lifeEvents),
        JSON.stringify(socialData.importantDates),
        JSON.stringify(socialData.keyTopics),
        JSON.stringify(socialData.followUpOpportunities)
      ]);

      logger.debug('Stored social interaction', { messageId: message.id });
    } catch (error) {
      logger.error('Error storing social interaction', {
        messageId: message.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get messages requiring response
   */
  async getMessagesRequiringResponse() {
    try {
      const messages = await this.db.all(`
        SELECT si.*, m.subject, m.body, m.date
        FROM social_interactions si
        JOIN messages m ON si.message_id = m.id
        WHERE si.requires_response = 1
        ORDER BY 
          CASE si.response_urgency
            WHEN 'high' THEN 1
            WHEN 'medium' THEN 2
            WHEN 'low' THEN 3
            ELSE 4
          END,
          si.created_at DESC
      `);

      return messages;
    } catch (error) {
      logger.error('Error getting messages requiring response', { error: error.message });
      throw error;
    }
  }

  /**
   * Get upcoming important dates (birthdays, anniversaries, etc.)
   */
  async getUpcomingImportantDates(daysAhead = 30) {
    try {
      const messages = await this.db.all(`
        SELECT si.*, m.from_email, m.subject
        FROM social_interactions si
        JOIN messages m ON si.message_id = m.id
        WHERE si.important_dates IS NOT NULL
          AND si.important_dates != '[]'
        ORDER BY si.created_at DESC
      `);

      // Parse and filter dates
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + daysAhead);

      const upcomingDates = [];

      for (const msg of messages) {
        try {
          const dates = JSON.parse(msg.important_dates);
          for (const dateInfo of dates) {
            const eventDate = new Date(dateInfo.date);
            if (eventDate >= today && eventDate <= futureDate) {
              upcomingDates.push({
                ...dateInfo,
                fromEmail: msg.from_email,
                daysUntil: Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24))
              });
            }
          }
        } catch (e) {
          logger.warn('Error parsing important dates', { messageId: msg.message_id });
        }
      }

      // Sort by date
      upcomingDates.sort((a, b) => new Date(a.date) - new Date(b.date));

      return upcomingDates;
    } catch (error) {
      logger.error('Error getting upcoming important dates', { error: error.message });
      throw error;
    }
  }

  /**
   * Get relationship summary for a specific contact
   */
  async getRelationshipSummary(email) {
    try {
      const interactions = await this.db.all(`
        SELECT si.*, m.subject, m.date, m.snippet
        FROM social_interactions si
        JOIN messages m ON si.message_id = m.id
        WHERE si.from_email = ?
        ORDER BY si.created_at DESC
        LIMIT 20
      `, [email]);

      if (interactions.length === 0) {
        return null;
      }

      // Aggregate data
      const summary = {
        email: email,
        totalInteractions: interactions.length,
        relationshipType: interactions[0].relationship_type,
        lastContact: interactions[0].created_at,
        commonTopics: this.extractCommonTopics(interactions),
        lifeEvents: this.extractAllLifeEvents(interactions),
        pendingResponses: interactions.filter(i => i.requires_response).length
      };

      return summary;
    } catch (error) {
      logger.error('Error getting relationship summary', { error: error.message });
      throw error;
    }
  }

  /**
   * Extract common topics from interactions
   */
  extractCommonTopics(interactions) {
    const topicCount = {};
    
    for (const interaction of interactions) {
      try {
        const topics = JSON.parse(interaction.key_topics || '[]');
        for (const topic of topics) {
          topicCount[topic] = (topicCount[topic] || 0) + 1;
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }

    // Sort by frequency and return top 5
    return Object.entries(topicCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic]) => topic);
  }

  /**
   * Extract all life events from interactions
   */
  extractAllLifeEvents(interactions) {
    const events = [];
    
    for (const interaction of interactions) {
      try {
        const lifeEvents = JSON.parse(interaction.life_events || '[]');
        events.push(...lifeEvents);
      } catch (e) {
        // Skip invalid JSON
      }
    }

    return events;
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

module.exports = SocialAgent;