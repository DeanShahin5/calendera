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
   * Initialize and connect to Beeper MCP server
   */
  async connect() {
    try {
      logger.info('Connecting to Beeper MCP server...');

      // Create transport - connects to Beeper MCP server via stdio
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-beeper'],
        env: {
          ...process.env,
          BEEPER_USERNAME: process.env.BEEPER_USERNAME,
          BEEPER_PASSWORD: process.env.BEEPER_PASSWORD,
        },
      });

      // Create MCP client
      this.client = new Client({
        name: 'beeper-inbox-agent',
        version: '1.0.0',
      }, {
        capabilities: {
          resources: {},
        },
      });

      // Connect client to transport
      await this.client.connect(this.transport);
      this.connected = true;

      logger.info('Successfully connected to Beeper MCP server');
      return true;
    } catch (error) {
      logger.error('Failed to connect to Beeper MCP', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all available rooms/conversations
   */
  async getRooms() {
    if (!this.connected) {
      throw new Error('Not connected to Beeper MCP');
    }

    try {
      const result = await this.client.request({
        method: 'resources/list',
      }, {});

      // Filter for room resources
      const rooms = result.resources.filter(r => r.uri.startsWith('beeper://room/'));
      
      logger.debug(`Found ${rooms.length} rooms`);
      return rooms;
    } catch (error) {
      logger.error('Error getting rooms', { error: error.message });
      throw error;
    }
  }

  /**
   * Get messages from a specific room
   */
  async getRoomMessages(roomId, limit = 50) {
    if (!this.connected) {
      throw new Error('Not connected to Beeper MCP');
    }

    try {
      const result = await this.client.request({
        method: 'resources/read',
        params: {
          uri: `beeper://room/${roomId}/messages?limit=${limit}`,
        },
      }, {});

      return this.parseMessages(result.contents);
    } catch (error) {
      logger.error('Error getting room messages', { roomId, error: error.message });
      throw error;
    }
  }

  /**
   * Get recent messages across all platforms
   */
  async getRecentMessages(limit = 20) {
    if (!this.connected) {
      throw new Error('Not connected to Beeper MCP');
    }

    try {
      const rooms = await this.getRooms();
      const allMessages = [];

      for (const room of rooms) {
        try {
          const roomId = room.uri.replace('beeper://room/', '');
          const messages = await this.getRoomMessages(roomId, limit);
          allMessages.push(...messages);
        } catch (error) {
          logger.warn(`Failed to get messages from room ${room.name}`, {
            error: error.message
          });
        }
      }

      // Sort by timestamp (newest first)
      allMessages.sort((a, b) => b.timestamp - a.timestamp);

      logger.info(`Fetched ${allMessages.length} total messages from ${rooms.length} rooms`);
      return allMessages;
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
      throw new Error('Not connected to Beeper MCP');
    }

    try {
      const rooms = await this.getRooms();
      const filteredRooms = rooms.filter(room => {
        const platform = this.extractPlatform(room.uri);
        return platforms.includes(platform);
      });

      const allMessages = [];

      for (const room of filteredRooms) {
        try {
          const roomId = room.uri.replace('beeper://room/', '');
          const messages = await this.getRoomMessages(roomId, limit);
          allMessages.push(...messages);
        } catch (error) {
          logger.warn(`Failed to get messages from room ${room.name}`, {
            error: error.message
          });
        }
      }

      allMessages.sort((a, b) => b.timestamp - a.timestamp);

      logger.info(`Fetched ${allMessages.length} messages from ${platforms.join(', ')}`);
      return allMessages;
    } catch (error) {
      logger.error('Error getting platform messages', { error: error.message });
      throw error;
    }
  }

  /**
   * Parse messages from MCP response
   */
  parseMessages(contents) {
    try {
      if (Array.isArray(contents)) {
        return contents.map(content => this.parseMessage(content));
      } else if (typeof contents === 'object') {
        return [this.parseMessage(contents)];
      } else if (typeof contents === 'string') {
        const parsed = JSON.parse(contents);
        if (Array.isArray(parsed)) {
          return parsed.map(msg => this.parseMessage(msg));
        }
        return [this.parseMessage(parsed)];
      }
      return [];
    } catch (error) {
      logger.error('Error parsing messages', { error: error.message });
      return [];
    }
  }

  /**
   * Parse individual message into normalized format
   */
  parseMessage(message) {
    return {
      id: message.id || message.event_id,
      platform: message.platform || this.extractPlatform(message.room_id),
      roomId: message.room_id,
      roomName: message.room_name,
      from_contact: message.sender || message.from,
      from_name: message.sender_name || message.from_name,
      body: message.body || message.text || message.content || '',
      timestamp: message.timestamp || Date.now(),
      date: message.date || new Date(message.timestamp).toISOString(),
      is_group_message: message.is_group || false,
      has_attachments: message.has_attachments || false,
      attachments: message.attachments || [],
      participants: message.participants || [],
      is_unread: message.is_unread || false,
      raw: message
    };
  }

  /**
   * Extract platform from room ID or URI
   */
  extractPlatform(identifier) {
    if (!identifier) return 'unknown';
    
    const platformPatterns = {
      'imessage': /imessage/i,
      'whatsapp': /whatsapp/i,
      'telegram': /telegram/i,
      'signal': /signal/i,
      'slack': /slack/i,
      'discord': /discord/i,
      'sms': /sms/i,
      'instagram': /instagram/i,
      'messenger': /messenger/i,
    };

    for (const [platform, pattern] of Object.entries(platformPatterns)) {
      if (pattern.test(identifier)) {
        return platform;
      }
    }

    return 'unknown';
  }

  /**
   * Disconnect from Beeper MCP
   */
  async disconnect() {
    try {
      if (this.client && this.connected) {
        await this.client.close();
        this.connected = false;
        logger.info('Disconnected from Beeper MCP');
      }
    } catch (error) {
      logger.error('Error disconnecting from Beeper MCP', { error: error.message });
    }
  }
}

module.exports = BeeperMCPClient;
