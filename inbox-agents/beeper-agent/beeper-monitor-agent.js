const BeeperMCPClient = require('./beeper-mcp-client');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');

/**
 * Beeper Monitor Agent
 * Monitors Beeper for new messages across all platforms
 * Replaces the Gmail Inbox Monitor Agent
 */
class BeeperMonitorAgent {
  constructor() {
    this.beeperClient = null;
    this.lastCheckTime = null;
    this.dataPath = process.env.DATA_PATH || './data';
    this.stateFile = path.join(this.dataPath, 'beeper-monitor-state.json');
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing Beeper Monitor Agent...');
      
      // Initialize Beeper MCP client
      this.beeperClient = new BeeperMCPClient();
      await this.beeperClient.initialize();
      
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataPath, { recursive: true });
      
      // Load last check time
      await this.loadState();
      
      logger.info('Beeper Monitor Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize Beeper Monitor Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Load agent state from file
   */
  async loadState() {
    try {
      const data = await fs.readFile(this.stateFile, 'utf8');
      const state = JSON.parse(data);
      this.lastCheckTime = state.lastCheckTime;
      logger.info('Loaded previous state', { lastCheckTime: this.lastCheckTime });
    } catch (error) {
      // File doesn't exist or is corrupted, start fresh
      logger.info('No previous state found, starting fresh');
      this.lastCheckTime = Date.now();
    }
  }

  /**
   * Save agent state to file
   */
  async saveState() {
    try {
      const state = {
        lastCheckTime: this.lastCheckTime,
        lastUpdated: new Date().toISOString()
      };
      await fs.writeFile(this.stateFile, JSON.stringify(state, null, 2));
    } catch (error) {
      logger.error('Failed to save state', { error: error.message });
    }
  }

  /**
   * Check for new messages since last check
   */
  async checkForNewMessages() {
    try {
      logger.info('Checking for new messages from Beeper...');
      
      // Fetch messages since last check
      const messages = await this.beeperClient.getRecentMessages({
        limit: 100,
        since: this.lastCheckTime,
        unreadOnly: false, // Get all messages, not just unread
      });

      logger.info(`Found ${messages.length} new messages from Beeper`);

      if (messages.length === 0) {
        return [];
      }

      // Update last check time to most recent message timestamp
      const latestTimestamp = Math.max(...messages.map(m => m.timestamp));
      this.lastCheckTime = latestTimestamp;
      await this.saveState();

      return messages;
    } catch (error) {
      logger.error('Error checking for new messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Get messages from specific platforms only
   */
  async checkPlatformMessages(platforms = []) {
    try {
      logger.info(`Checking for messages from platforms: ${platforms.join(', ')}`);
      
      const messages = await this.beeperClient.getRecentMessages({
        limit: 100,
        since: this.lastCheckTime,
        platforms,
      });

      logger.info(`Found ${messages.length} messages from specified platforms`);
      return messages;
    } catch (error) {
      logger.error('Error checking platform messages', { 
        platforms, 
        error: error.message 
      });
      throw error;
    }
  }

  /**
   * Get unread messages only
   */
  async checkUnreadMessages() {
    try {
      logger.info('Checking for unread messages...');
      
      const messages = await this.beeperClient.getRecentMessages({
        limit: 100,
        unreadOnly: true,
      });

      logger.info(`Found ${messages.length} unread messages`);
      return messages;
    } catch (error) {
      logger.error('Error checking unread messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all active rooms/conversations
   */
  async getRooms() {
    try {
      logger.info('Fetching active rooms...');
      
      const rooms = await this.beeperClient.getRooms({
        limit: 200,
      });

      logger.info(`Found ${rooms.length} active rooms`);
      return rooms;
    } catch (error) {
      logger.error('Error fetching rooms', { error: error.message });
      throw error;
    }
  }

  /**
   * Get rooms with unread messages
   */
  async getRoomsWithUnread() {
    try {
      logger.info('Fetching rooms with unread messages...');
      
      const rooms = await this.beeperClient.getRooms({
        limit: 200,
        hasUnread: true,
      });

      logger.info(`Found ${rooms.length} rooms with unread messages`);
      return rooms;
    } catch (error) {
      logger.error('Error fetching rooms with unread', { error: error.message });
      throw error;
    }
  }

  /**
   * Search for messages by keyword
   */
  async searchMessages(query, options = {}) {
    try {
      logger.info(`Searching messages for: "${query}"`);
      
      const messages = await this.beeperClient.searchMessages(query, {
        limit: options.limit || 50,
        platforms: options.platforms || null,
      });

      logger.info(`Found ${messages.length} messages matching "${query}"`);
      return messages;
    } catch (error) {
      logger.error('Error searching messages', { query, error: error.message });
      throw error;
    }
  }

  /**
   * Save messages to file for processing by other agents
   */
  async saveMessages(messages) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = path.join(this.dataPath, `beeper-messages-${timestamp}.json`);
      
      await fs.writeFile(filename, JSON.stringify(messages, null, 2));
      logger.info(`Saved ${messages.length} messages to ${filename}`);
      
      return filename;
    } catch (error) {
      logger.error('Error saving messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Get statistics about messages
   */
  async getStatistics(messages) {
    const stats = {
      total: messages.length,
      byPlatform: {},
      byType: {},
      groupMessages: 0,
      withAttachments: 0,
    };

    messages.forEach(msg => {
      // Count by platform
      stats.byPlatform[msg.platform] = (stats.byPlatform[msg.platform] || 0) + 1;
      
      // Count by type
      stats.byType[msg.messageType] = (stats.byType[msg.messageType] || 0) + 1;
      
      // Count group messages
      if (msg.isGroupMessage) {
        stats.groupMessages++;
      }
      
      // Count messages with attachments
      if (msg.hasAttachments) {
        stats.withAttachments++;
      }
    });

    return stats;
  }

  /**
   * Main monitoring loop
   */
  async monitor() {
    try {
      const messages = await this.checkForNewMessages();
      
      if (messages.length > 0) {
        logger.info(`Processing ${messages.length} new messages`);
        
        // Get statistics
        const stats = await this.getStatistics(messages);
        logger.info('Message statistics', stats);
        
        // Save messages for other agents to process
        const filename = await this.saveMessages(messages);
        
        // Return messages for immediate processing
        return {
          count: messages.length,
          messages: messages,
          stats: stats,
          savedTo: filename
        };
      }
      
      return {
        count: 0,
        messages: [],
        stats: {},
        savedTo: null
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
      await this.beeperClient.close();
    }
  }
}

module.exports = BeeperMonitorAgent;
