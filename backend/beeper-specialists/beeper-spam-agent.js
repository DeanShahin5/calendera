const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const BeeperDatabase = require('../beeper-database');

class BeeperSpamAgent {
  constructor() {
    this.anthropic = null;
    this.db = new BeeperDatabase();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Beeper Spam Agent...');

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

      logger.info('Beeper Spam Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Beeper Spam Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Analyze a message for spam/scam content
   */
  async analyzeSpam(message) {
    try {
      logger.info(`Analyzing spam for ${message.platform} message from ${message.from_name}`);

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
    return `You are a specialized spam and scam detection AI for chat messages. Your task is to analyze a message from ${message.platform} and determine if it's spam, scam, phishing, or legitimate communication.

Message Details:
Platform: ${message.platform}
From: ${message.from_name} (${message.from_contact})
Room: ${message.room_name || 'Direct Message'}
Date: ${message.date}
Is Group: ${message.is_group_message}
Body:
${message.body}

Your task is to:
1. Determine if this is spam, scam, or legitimate message
2. Identify the specific type of spam/scam
3. Detect potential phishing or fraud attempts
4. Assess the severity/danger level
5. Provide reasoning for the classification

Analyze for:

**Spam Indicators:**
- Generic greetings from unknown contacts
- Excessive use of urgency ("Act now!", "Limited time!")
- Too many exclamation marks or ALL CAPS
- Suspicious links or shortened URLs
- Requests for personal information or money
- Poor grammar or spelling (especially from supposed companies)
- Unsolicited promotional content
- Prize/lottery/inheritance scams
- Impersonal bulk message characteristics
- Messages from recently created accounts

**Spam Types:**
- **marketing**: Promotional messages, sales, advertisements
- **phishing**: Attempts to steal credentials or personal info
- **scam**: Fraudulent schemes, fake prizes, advance-fee fraud, romance scams
- **impersonation**: Pretending to be someone else (bank, company, friend)
- **malware**: Links to malicious software
- **crypto_scam**: Cryptocurrency scams, investment fraud
- **automated**: Auto-generated spam, bots
- **legitimate**: Real, personal, or important communication

**Severity Levels:**
- **safe**: Legitimate message, no concerns
- **low**: Annoying but harmless (marketing)
- **medium**: Aggressive spam, unsolicited content
- **high**: Potential scam, suspicious content
- **critical**: Likely phishing/fraud, dangerous content

**Red Flags to Check:**
- Unknown sender asking for money or personal info
- Suspicious URLs (typosquatting, shortened links)
- Requests for passwords, SSN, credit cards, bank info
- Threats or pressure tactics
- Too-good-to-be-true offers
- Impersonation of known companies/people
- Urgent requests from "family" or "friends" in trouble
- Cryptocurrency investment opportunities
- Prize notifications you didn't enter

Return ONLY a valid JSON object with no additional text. Format:

{
  "isSpam": true,
  "confidence": 0.94,
  "spamType": "scam",
  "severity": "high",
  "reasoning": "Suspicious request for money from unknown contact with urgency tactics",
  "indicators": [
    "Unknown sender",
    "Requests money",
    "Urgent language",
    "Suspicious story"
  ],
  "redFlags": [
    "Asks for money transfer",
    "Claims emergency situation",
    "No verification possible"
  ],
  "recommendation": "block_and_report",
  "actionable": {
    "shouldBlock": true,
    "shouldReport": true,
    "shouldDelete": true,
    "shouldWarn": true
  }
}

For legitimate message:
{
  "isSpam": false,
  "confidence": 0.92,
  "spamType": "legitimate",
  "severity": "safe",
  "reasoning": "Personal communication from known contact with specific content",
  "indicators": [],
  "redFlags": [],
  "recommendation": "keep",
  "actionable": {
    "shouldBlock": false,
    "shouldReport": false,
    "shouldDelete": false,
    "shouldWarn": false
  }
}`;
  }

  /**
   * Process all SPAM category messages
   */
  async processSpamMessages() {
    try {
      logger.info('Processing Beeper SPAM messages...');

      // Get all processed messages with SPAM category
      const messages = await this.db.all(`
        SELECT m.*, pm.category, pm.confidence as category_confidence
        FROM beeper_messages m
        JOIN beeper_processed_messages pm ON m.id = pm.message_id
        LEFT JOIN beeper_spam_analysis sa ON m.id = sa.message_id
        WHERE pm.category = 'SPAM' AND sa.id IS NULL
        ORDER BY m.timestamp DESC
        LIMIT 100
      `);

      logger.info(`Found ${messages.length} SPAM messages to process`);

      let processedCount = 0;
      let spamDetected = 0;
      let dangerousDetected = 0;

      for (const message of messages) {
        try {
          const result = await this.analyzeSpam(message);

          // Store spam analysis
          await this.storeSpamAnalysis(message, result);

          if (result.isSpam) {
            spamDetected++;
            
            if (result.severity === 'critical' || result.severity === 'high') {
              dangerousDetected++;
              logger.warn(`DANGEROUS MESSAGE DETECTED: ${result.spamType} from ${message.from_name} on ${message.platform}`);
            }
          }

          processedCount++;
        } catch (error) {
          logger.error(`Failed to process SPAM message ${message.id}`, {
            messageId: message.id,
            error: error.message
          });
        }
      }

      return {
        processed: processedCount,
        spamDetected: spamDetected,
        dangerousDetected: dangerousDetected
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
      // Insert spam analysis
      await this.db.run(`
        INSERT INTO beeper_spam_analysis (
          message_id, from_contact, is_spam, spam_type, severity,
          confidence, reasoning, indicators, red_flags,
          recommendation, should_block, should_report
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        message.id,
        message.from_contact,
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
   * Get dangerous messages (phishing, scams)
   */
  async getDangerousMessages() {
    try {
      const dangerous = await this.db.all(`
        SELECT sa.*, m.body, m.date, m.from_name, m.platform
        FROM beeper_spam_analysis sa
        JOIN beeper_messages m ON sa.message_id = m.id
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
      logger.error('Error getting dangerous messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contacts to block
   */
  async getContactsToBlock() {
    try {
      const contacts = await this.db.all(`
        SELECT 
          from_contact,
          COUNT(*) as spam_count,
          MAX(severity) as max_severity,
          GROUP_CONCAT(DISTINCT spam_type) as spam_types
        FROM beeper_spam_analysis
        WHERE should_block = 1
        GROUP BY from_contact
        ORDER BY spam_count DESC
      `);

      return contacts;
    } catch (error) {
      logger.error('Error getting contacts to block', { error: error.message });
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

module.exports = BeeperSpamAgent;
