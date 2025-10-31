const BeeperMCPClient = require('../../beeper-mcp-client');
const logger = require('../../utils/logger');
const BeeperDatabase = require('../../beeper-database');

class BeeperMonitorAgent {
  constructor() {
    this.beeperClient = null;
    this.lastCheckTime = null;
    this.db = new BeeperDatabase();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Beeper Monitor Agent...');
      
      // Initialize database
      await this.db.initialize();
      
      // Initialize Beeper MCP client
      this.beeperClient = new BeeperMCPClient();
      await this.beeperClient.connect();
      
      // Load last check time from database
      await this.loadState();
      
      logger.info('Beeper Monitor Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Beeper Monitor Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Load agent state - get timestamp of most recent message
   */
  async loadState() {
    try {
      const result = await this.db.get(
        'SELECT MAX(timestamp) as last_timestamp FROM beeper_messages'
      );
      
      if (result && result.last_timestamp) {
        this.lastCheckTime = result.last_timestamp;
        logger.info('Loaded previous state', { lastCheckTime: this.lastCheckTime });
      } else {
        logger.info('No previous state found, starting fresh');
        this.lastCheckTime = Date.now();
      }
    } catch (error) {
      logger.error('Error loading state', { error: error.message });
      this.lastCheckTime = Date.now();
    }
  }

  /**
   * Check for new messages since last check
   */
  async checkForNewMessages() {
    try {
      logger.info('Checking for new Beeper messages...');
      
      // Get platforms to monitor from env
      const platforms = process.env.BEEPER_PLATFORMS 
        ? process.env.BEEPER_PLATFORMS.split(',').map(p => p.trim())
        : null;
      
      const limit = parseInt(process.env.BEEPER_MESSAGES_PER_CHECK || '50');
      
      // Fetch messages
      const messages = platforms
        ? await this.beeperClient.getPlatformMessages(platforms, limit)
        : await this.beeperClient.getRecentMessages(limit);
      
      // Filter messages newer than last check
      const newMessages = messages.filter(msg => msg.timestamp > this.lastCheckTime);
      
      logger.info(`Found ${newMessages.length} new messages`);

      if (newMessages.length === 0) {
        return [];
      }

      // Update last check time
      this.lastCheckTime = Math.max(...newMessages.map(m => m.timestamp));

      return newMessages;
    } catch (error) {
      logger.error('Error checking for new messages', { error: error.message });
      throw error;
    }
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
          
          // Update catchup tracking for non-group messages
          if (!message.is_group_message && message.from_contact) {
            await this.db.updateCatchupTracking(
              message.from_contact,
              message.from_name,
              message.platform
            );
          }
          
          logger.debug('Saved message', { 
            id: message.id, 
            platform: message.platform,
            from: message.from_name
          });
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
    if (this.beeperClient) {
      await this.beeperClient.disconnect();
    }
    if (this.db) {
      await this.db.close();
    }
  }
}

module.exports = BeeperMonitorAgent;
