const { getGmailClient } = require('../../config/gmail-setup');
const logger = require('../../utils/logger');
const Database = require('../../database');

class InboxMonitorAgent {
  constructor() {
    this.gmail = null;
    this.lastCheckTime = null;
    this.db = new Database();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Inbox Monitor Agent...');
      
      // Initialize database
      await this.db.initialize();
      
      // Get Gmail client
      this.gmail = await getGmailClient();
      
      // Load last check time from database
      await this.loadState();
      
      logger.info('Inbox Monitor Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Inbox Monitor Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Load agent state - get timestamp of most recent message
   */
  async loadState() {
    try {
      const result = await this.db.get(
        'SELECT MAX(timestamp) as last_timestamp FROM messages'
      );
      
      if (result && result.last_timestamp) {
        this.lastCheckTime = Math.floor(result.last_timestamp / 1000);
        logger.info('Loaded previous state', { lastCheckTime: this.lastCheckTime });
      } else {
        logger.info('No previous state found, starting fresh');
        this.lastCheckTime = Math.floor(Date.now() / 1000);
      }
    } catch (error) {
      logger.error('Error loading state', { error: error.message });
      this.lastCheckTime = Math.floor(Date.now() / 1000);
    }
  }

  /**
   * Check for new messages since last check
   */
  async checkForNewMessages() {
    try {
      logger.info('Checking for new messages...');
      
      // Build query to get messages after last check time
      const query = this.lastCheckTime 
        ? `after:${this.lastCheckTime}` 
        : 'is:unread';
      
      // Get list of message IDs
      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50 // Adjust as needed
      });

      const messages = response.data.messages || [];
      logger.info(`Found ${messages.length} new messages`);

      if (messages.length === 0) {
        return [];
      }

      // Fetch full message details
      const fullMessages = await this.fetchMessageDetails(messages);
      
      // Update last check time
      this.lastCheckTime = Math.floor(Date.now() / 1000);

      return fullMessages;
    } catch (error) {
      logger.error('Error checking for new messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch detailed information for messages
   */
  async fetchMessageDetails(messages) {
    const fullMessages = [];

    for (const message of messages) {
      try {
        const detail = await this.gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full'
        });

        const parsedMessage = this.parseMessage(detail.data);
        fullMessages.push(parsedMessage);
        
        logger.debug('Fetched message', { 
          id: message.id, 
          subject: parsedMessage.subject 
        });
      } catch (error) {
        logger.error('Error fetching message details', { 
          id: message.id, 
          error: error.message 
        });
      }
    }

    return fullMessages;
  }

  /**
   * Parse Gmail message into structured format
   */
  parseMessage(message) {
    const headers = message.payload.headers;
    
    const getHeader = (name) => {
      const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
      return header ? header.value : '';
    };

    // Extract body
    let body = '';
    if (message.payload.body.data) {
      body = Buffer.from(message.payload.body.data, 'base64').toString('utf8');
    } else if (message.payload.parts) {
      // Handle multipart messages
      const textPart = message.payload.parts.find(part => 
        part.mimeType === 'text/plain'
      );
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf8');
      }
    }

    return {
      id: message.id,
      threadId: message.threadId,
      from: getHeader('from'),
      to: getHeader('to'),
      subject: getHeader('subject'),
      date: getHeader('date'),
      timestamp: parseInt(message.internalDate),
      body: body.substring(0, 5000), // Limit body length
      snippet: message.snippet,
      labels: message.labelIds || [],
      raw: message // Keep raw message for future reference
    };
  }

  /**
   * Save messages to database
   */
  async saveMessages(messages) {
    try {
      let savedCount = 0;
      
      for (const message of messages) {
        try {
          await this.db.insertMessage(message);
          savedCount++;
        } catch (error) {
          logger.error('Error saving message', { 
            id: message.id, 
            error: error.message 
          });
        }
      }
      
      logger.info(`Saved ${savedCount} messages to database`);
      return savedCount;
    } catch (error) {
      logger.error('Error saving messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Main monitoring loop
   */
  async monitor() {
    try {
      const messages = await this.checkForNewMessages();
      
      if (messages.length > 0) {
        logger.info(`Processing ${messages.length} new messages`);
        
        // Save messages to database
        const savedCount = await this.saveMessages(messages);
        
        // Return messages for immediate processing
        return {
          count: messages.length,
          saved: savedCount,
          messages: messages
        };
      }
      
      return {
        count: 0,
        saved: 0,
        messages: []
      };
    } catch (error) {
      logger.error('Error in monitoring loop', { error: error.message });
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

module.exports = InboxMonitorAgent;
