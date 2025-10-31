const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const Database = require('../database');

class SpamAgent {
  constructor() {
    this.anthropic = null;
    this.db = new Database();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Spam Agent...');

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

      logger.info('Spam Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Spam Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze a message for spam/promotional content
   * @param {Object} message - Processed message object
   * @returns {Object} Spam analysis with confidence scores
   */
  async analyzeSpam(message) {
    try {
      logger.info(`Analyzing spam for message: ${message.subject}`);

      // Build specialized prompt for spam detection
      const prompt = this.buildSpamPrompt(message);

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
      
      const spamData = JSON.parse(cleanedText);

      logger.info('Spam analysis complete', {
        messageId: message.id,
        isSpam: spamData.isSpam,
        spamType: spamData.spamType,
        confidence: spamData.confidence
      });

      return spamData;
    } catch (error) {
      logger.error('Failed to analyze spam', {
        messageId: message.id,
        subject: message.subject,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Build specialized prompt for spam detection
   */
  buildSpamPrompt(message) {
    return `You are a specialized spam and promotional email detection AI. Your task is to analyze an email and determine if it's spam, promotional content, phishing, or legitimate communication.

Email Details:
From: ${message.from_email}
To: ${message.to_email}
Subject: ${message.subject}
Date: ${message.date}
Body:
${message.body}

Your task is to:
1. Determine if this is spam, promotional, or legitimate email
2. Identify the specific type of spam/promotion
3. Detect potential phishing or scam attempts
4. Assess the severity/danger level
5. Provide reasoning for the classification

Analyze for:

**Spam Indicators:**
- Generic greetings ("Dear Customer", "Hello User")
- Excessive use of urgency ("Act now!", "Limited time!")
- Too many exclamation marks or ALL CAPS
- Suspicious links or attachments
- Requests for personal information
- Poor grammar or spelling
- Unsubscribe links or marketing language
- Sender domain doesn't match company name
- Impersonal bulk email characteristics

**Spam Types:**
- **marketing**: Promotional emails, sales, advertisements
- **newsletter**: Subscribed newsletters, updates
- **phishing**: Attempts to steal credentials or personal info
- **scam**: Fraudulent schemes, fake prizes, advance-fee fraud
- **cold_outreach**: Unsolicited business proposals, sales pitches
- **automated**: Auto-generated notifications, system emails
- **legitimate**: Real, personal, or important business communication

**Severity Levels:**
- **safe**: Legitimate email, no concerns
- **low**: Marketing/promotional, annoying but harmless
- **medium**: Aggressive marketing, cold outreach
- **high**: Potential scam, suspicious content
- **critical**: Likely phishing, dangerous content

**Red Flags to Check:**
- Mismatched sender email and display name
- Suspicious URLs (shortened links, typosquatting)
- Requests for passwords, SSN, credit cards
- Threats or pressure tactics
- Too-good-to-be-true offers
- Impersonation of known companies/people

Return ONLY a valid JSON object with no additional text. Format:

{
  "isSpam": true,
  "confidence": 0.94,
  "spamType": "marketing",
  "severity": "low",
  "reasoning": "Generic promotional email with unsubscribe link and marketing language",
  "indicators": [
    "Generic greeting",
    "Marketing language",
    "Unsubscribe link present",
    "Bulk email characteristics"
  ],
  "redFlags": [],
  "recommendation": "safe_to_ignore",
  "senderReputation": {
    "trustworthy": false,
    "knownCompany": true,
    "domainMatch": true
  },
  "actionable": {
    "shouldBlock": false,
    "shouldUnsubscribe": true,
    "shouldReport": false,
    "shouldDelete": true
  }
}

For phishing/scam:
{
  "isSpam": true,
  "confidence": 0.98,
  "spamType": "phishing",
  "severity": "critical",
  "reasoning": "Attempts to steal credentials by impersonating a bank",
  "indicators": [
    "Requests password/credentials",
    "Urgent threat language",
    "Suspicious sender domain"
  ],
  "redFlags": [
    "Sender domain doesn't match bank",
    "Requests sensitive information",
    "Threatening account closure"
  ],
  "recommendation": "report_and_delete",
  "senderReputation": {
    "trustworthy": false,
    "knownCompany": false,
    "domainMatch": false
  },
  "actionable": {
    "shouldBlock": true,
    "shouldUnsubscribe": false,
    "shouldReport": true,
    "shouldDelete": true
  }
}

For legitimate email:
{
  "isSpam": false,
  "confidence": 0.92,
  "spamType": "legitimate",
  "severity": "safe",
  "reasoning": "Personal communication from known contact with specific content",
  "indicators": [],
  "redFlags": [],
  "recommendation": "keep",
  "senderReputation": {
    "trustworthy": true,
    "knownCompany": null,
    "domainMatch": true
  },
  "actionable": {
    "shouldBlock": false,
    "shouldUnsubscribe": false,
    "shouldReport": false,
    "shouldDelete": false
  }
}`;
  }

  /**
   * Process all SPAM category messages
   * @returns {Object} Processing results
   */
  async processSpamMessages() {
    try {
      logger.info('Processing SPAM messages...');

      // Get all processed messages with SPAM category
      const messages = await this.db.all(`
        SELECT m.*, pm.category, pm.confidence as category_confidence
        FROM messages m
        JOIN processed_messages pm ON m.id = pm.message_id
        WHERE pm.category = 'SPAM'
        ORDER BY m.timestamp DESC
        LIMIT 100
      `);

      logger.info(`Found ${messages.length} SPAM messages to process`);

      let processedCount = 0;
      let spamDetected = 0;
      let phishingDetected = 0;

      for (const message of messages) {
        try {
          const result = await this.analyzeSpam(message);

          // Store spam analysis
          await this.storeSpamAnalysis(message, result);

          if (result.isSpam) {
            spamDetected++;
            
            if (result.spamType === 'phishing' || result.severity === 'critical') {
              phishingDetected++;
              logger.warn(`PHISHING DETECTED: ${message.subject} from ${message.from_email}`);
            }
          }

          processedCount++;
        } catch (error) {
          logger.error(`Failed to process SPAM message ${message.id}`, {
            messageId: message.id,
            subject: message.subject,
            error: error.message
          });
        }
      }

      return {
        processed: processedCount,
        spamDetected: spamDetected,
        phishingDetected: phishingDetected
      };
    } catch (error) {
      logger.error('Error in processSpamMessages', { error: error.message });
      throw error;
    }
  }

  /**
   * Store spam analysis in database
   */
  async storeSpamAnalysis(message, spamData) {
    try {
      // Create spam_analysis table if it doesn't exist
      await this.db.run(`
        CREATE TABLE IF NOT EXISTS spam_analysis (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id TEXT,
          from_email TEXT,
          is_spam BOOLEAN,
          spam_type TEXT,
          severity TEXT,
          confidence REAL,
          reasoning TEXT,
          indicators TEXT,
          red_flags TEXT,
          recommendation TEXT,
          should_block BOOLEAN,
          should_report BOOLEAN,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages(id)
        )
      `);

      // Insert spam analysis
      await this.db.run(`
        INSERT INTO spam_analysis (
          message_id, from_email, is_spam, spam_type, severity,
          confidence, reasoning, indicators, red_flags,
          recommendation, should_block, should_report
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        message.from_email,
        spamData.isSpam ? 1 : 0,
        spamData.spamType,
        spamData.severity,
        spamData.confidence,
        spamData.reasoning,
        JSON.stringify(spamData.indicators),
        JSON.stringify(spamData.redFlags),
        spamData.recommendation,
        spamData.actionable.shouldBlock ? 1 : 0,
        spamData.actionable.shouldReport ? 1 : 0
      ]);

      logger.debug('Stored spam analysis', { messageId: message.id });
    } catch (error) {
      logger.error('Error storing spam analysis', {
        messageId: message.id,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get dangerous emails (phishing, scams)
   */
  async getDangerousEmails() {
    try {
      const dangerous = await this.db.all(`
        SELECT sa.*, m.subject, m.body, m.date
        FROM spam_analysis sa
        JOIN messages m ON sa.message_id = m.id
        WHERE sa.severity IN ('high', 'critical')
        ORDER BY sa.created_at DESC
        LIMIT 50
      `);

      return dangerous.map(item => ({
        ...item,
        indicators: JSON.parse(item.indicators || '[]'),
        red_flags: JSON.parse(item.red_flags || '[]')
      }));
    } catch (error) {
      logger.error('Error getting dangerous emails', { error: error.message });
      throw error;
    }
  }

  /**
   * Get spam statistics by sender
   */
  async getSpamStatsBySender() {
    try {
      const stats = await this.db.all(`
        SELECT 
          from_email,
          COUNT(*) as total_emails,
          SUM(CASE WHEN is_spam = 1 THEN 1 ELSE 0 END) as spam_count,
          spam_type,
          AVG(confidence) as avg_confidence
        FROM spam_analysis
        WHERE is_spam = 1
        GROUP BY from_email, spam_type
        HAVING spam_count > 0
        ORDER BY spam_count DESC
        LIMIT 50
      `);

      return stats;
    } catch (error) {
      logger.error('Error getting spam stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get senders to block
   */
  async getSendersToBlock() {
    try {
      const senders = await this.db.all(`
        SELECT 
          from_email,
          COUNT(*) as spam_count,
          MAX(severity) as max_severity,
          GROUP_CONCAT(DISTINCT spam_type) as spam_types
        FROM spam_analysis
        WHERE should_block = 1
        GROUP BY from_email
        ORDER BY spam_count DESC
      `);

      return senders;
    } catch (error) {
      logger.error('Error getting senders to block', { error: error.message });
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

module.exports = SpamAgent;