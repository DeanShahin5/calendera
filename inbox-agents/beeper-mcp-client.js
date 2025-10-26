const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const logger = require('./utils/logger');

class BeeperMCPClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.connected = false;
  }

  /**
   * Initialize and connect to Beeper Desktop MCP server
   * Uses OAuth authentication - no credentials needed (handled by Beeper Desktop)
   */
  async connect() {
    try {
      logger.info('Connecting to Beeper Desktop MCP server...');

      // Create transport - connects to Beeper Desktop MCP via stdio
      // OAuth is handled automatically by Beeper Desktop
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@beeper/desktop-mcp']
      });

      // Create MCP client
      this.client = new Client({
        name: 'calendera-beeper-client',
        version: '1.0.0',
      }, {
        capabilities: {
          tools: {},
        },
      });

      // Connect client to transport
      await this.client.connect(this.transport);
      this.connected = true;

      logger.info('Successfully connected to Beeper Desktop MCP server');
      logger.info('OAuth authentication handled by Beeper Desktop');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Beeper Desktop MCP', { error: error.message });
      logger.error('Make sure Beeper Desktop is running and you are logged in');
      throw error;
    }
  }

  /**
   * Get all available chats/conversations using list_chats tool
   */
  async getRooms() {
    if (!this.connected) {
      throw new Error('Not connected to Beeper Desktop MCP');
    }

    try {
      const result = await this.client.callTool({
        name: 'list_chats',
        arguments: {}
      });

      // Parse the result
      const chats = result.content?.[0]?.text ? JSON.parse(result.content[0].text) : [];

      logger.debug(`Found ${chats.length} chats`);
      return chats;
    } catch (error) {
      logger.error('Error getting chats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get messages from a specific chat using get_chat_messages tool
   */
  async getRoomMessages(chatId, limit = 50) {
    if (!this.connected) {
      throw new Error('Not connected to Beeper Desktop MCP');
    }

    try {
      const result = await this.client.callTool({
        name: 'get_chat_messages',
        arguments: {
          chat_id: chatId,
          limit: limit
        }
      });

      // Parse the result
      const messages = result.content?.[0]?.text ? JSON.parse(result.content[0].text) : [];

      return this.parseMessages(messages);
    } catch (error) {
      logger.error('Error getting chat messages', { chatId, error: error.message });
      throw error;
    }
  }

  /**
   * Get recent messages across all platforms
   */
  async getRecentMessages(limit = 20) {
    if (!this.connected) {
      throw new Error('Not connected to Beeper Desktop MCP');
    }

    try {
      const chats = await this.getRooms();
      const allMessages = [];

      for (const chat of chats) {
        try {
          const chatId = chat.id || chat.chat_id;
          const messages = await this.getRoomMessages(chatId, Math.min(limit, 10));
          allMessages.push(...messages);
        } catch (error) {
          logger.warn(`Failed to get messages from chat ${chat.name || chat.id}`, {
            error: error.message
          });
        }
      }

      // Sort by timestamp (newest first)
      allMessages.sort((a, b) => b.timestamp - a.timestamp);

      // Limit to requested number
      const limitedMessages = allMessages.slice(0, limit);

      logger.info(`Fetched ${limitedMessages.length} total messages from ${chats.length} chats`);
      return limitedMessages;
    } catch (error) {
      logger.error('Error getting recent messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Get messages from specific platforms only
   */
  async getPlatformMessages(platforms, limit = 20) {
    if (!this.connected) {
      throw new Error('Not connected to Beeper Desktop MCP');
    }

    try {
      const chats = await this.getRooms();
      const filteredChats = chats.filter(chat => {
        const platform = this.extractPlatform(chat.bridge_type || chat.type || chat.platform || '');
        return platforms.includes(platform);
      });

      const allMessages = [];

      for (const chat of filteredChats) {
        try {
          const chatId = chat.id || chat.chat_id;
          const messages = await this.getRoomMessages(chatId, Math.min(limit, 10));
          allMessages.push(...messages);
        } catch (error) {
          logger.warn(`Failed to get messages from chat ${chat.name || chat.id}`, {
            error: error.message
          });
        }
      }

      allMessages.sort((a, b) => b.timestamp - a.timestamp);

      // Limit to requested number
      const limitedMessages = allMessages.slice(0, limit);

      logger.info(`Fetched ${limitedMessages.length} messages from ${platforms.join(', ')}`);
      return limitedMessages;
    } catch (error) {
      logger.error('Error getting platform messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Search messages using search_messages tool
   */
  async searchMessages(query, limit = 20) {
    if (!this.connected) {
      throw new Error('Not connected to Beeper Desktop MCP');
    }

    try {
      const result = await this.client.callTool({
        name: 'search_messages',
        arguments: {
          query: query,
          limit: limit
        }
      });

      // Parse the result
      const messages = result.content?.[0]?.text ? JSON.parse(result.content[0].text) : [];

      logger.info(`Found ${messages.length} messages matching "${query}"`);
      return this.parseMessages(messages);
    } catch (error) {
      logger.error('Error searching messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Parse messages from Beeper Desktop MCP response
   */
  parseMessages(contents) {
    try {
      if (!contents) return [];

      if (Array.isArray(contents)) {
        return contents.map(content => this.parseMessage(content));
      } else if (typeof contents === 'object') {
        return [this.parseMessage(contents)];
      }
      return [];
    } catch (error) {
      logger.error('Error parsing messages', { error: error.message });
      return [];
    }
  }

  /**
   * Parse individual message into normalized format from Beeper Desktop
   */
  parseMessage(message) {
    // Extract timestamp (can be in milliseconds or seconds)
    let timestamp = message.timestamp || message.sent_at || Date.now();
    if (timestamp < 10000000000) {
      timestamp = timestamp * 1000; // Convert seconds to milliseconds
    }

    return {
      id: message.id || message.message_id || message.event_id,
      platform: this.extractPlatform(message.bridge_type || message.platform || message.network || ''),
      roomId: message.chat_id || message.room_id,
      roomName: message.chat_name || message.room_name || '',
      from_contact: message.sender_id || message.sender || message.from,
      from_name: message.sender_name || message.from_name || message.display_name || '',
      body: message.text || message.body || message.content || '',
      timestamp: timestamp,
      date: message.date || new Date(timestamp).toISOString(),
      is_group_message: message.is_group || message.is_group_chat || false,
      has_attachments: message.has_attachments || (message.attachments && message.attachments.length > 0) || false,
      attachments: message.attachments || [],
      participants: message.participants || [],
      is_unread: message.is_unread || false,
      raw: message
    };
  }

  /**
   * Extract platform from Beeper bridge type or identifier
   */
  extractPlatform(identifier) {
    if (!identifier) return 'unknown';

    // Normalize identifier to lowercase
    const id = identifier.toLowerCase();

    // Map Beeper bridge types to platform names
    const platformMap = {
      'imessage': 'imessage',
      'whatsapp': 'whatsapp',
      'whatsappbusiness': 'whatsapp',
      'telegram': 'telegram',
      'signal': 'signal',
      'signalgo': 'signal',
      'slack': 'slack',
      'discord': 'discord',
      'googlechat': 'googlechat',
      'instagram': 'instagram',
      'messenger': 'messenger',
      'facebook': 'messenger',
      'sms': 'sms',
      'linkedin': 'linkedin',
      'twitter': 'twitter',
      'gmessages': 'sms',
      'androidmessages': 'sms'
    };

    // Direct match
    if (platformMap[id]) {
      return platformMap[id];
    }

    // Pattern matching for partial matches
    const platformPatterns = {
      'imessage': /imessage/i,
      'whatsapp': /whatsapp/i,
      'telegram': /telegram/i,
      'signal': /signal/i,
      'slack': /slack/i,
      'discord': /discord/i,
      'sms': /sms|gmessages|androidmessages/i,
      'instagram': /instagram/i,
      'messenger': /messenger|facebook/i,
      'googlechat': /googlechat|gchat/i
    };

    for (const [platform, pattern] of Object.entries(platformPatterns)) {
      if (pattern.test(identifier)) {
        return platform;
      }
    }

    return 'unknown';
  }

  /**
   * Disconnect from Beeper Desktop MCP
   */
  async disconnect() {
    try {
      if (this.client && this.connected) {
        await this.client.close();
        this.connected = false;
        logger.info('Disconnected from Beeper Desktop MCP');
      }
    } catch (error) {
      logger.error('Error disconnecting from Beeper Desktop MCP', { error: error.message });
    }
  }
}

module.exports = BeeperMCPClient;
