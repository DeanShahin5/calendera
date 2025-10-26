const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const logger = require('../../utils/logger');

/**
 * Beeper MCP Client
 * Connects to Beeper MCP server and provides methods to fetch messages
 */
class BeeperMCPClient {
  constructor() {
    this.client = null;
    this.transport = null;
    this.isConnected = false;
  }

  /**
   * Initialize connection to Beeper MCP server
   */
  async initialize() {
    try {
      logger.info('Initializing Beeper MCP client...');

      // Create transport - connects to Beeper MCP server via stdio
      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['-y', '@beeper/mcp-server'],
        env: {
          ...process.env,
          // Add Beeper credentials if needed
          BEEPER_USERNAME: process.env.BEEPER_USERNAME,
          BEEPER_PASSWORD: process.env.BEEPER_PASSWORD,
        },
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'beeper-inbox-automation',
          version: '1.0.0',
        },
        {
          capabilities: {
            tools: {},
          },
        }
      );

      // Connect to server
      await this.client.connect(this.transport);
      this.isConnected = true;

      logger.info('Beeper MCP client connected successfully');
      
      // Get available tools from server
      const tools = await this.listTools();
      logger.info(`Available Beeper tools: ${tools.map(t => t.name).join(', ')}`);

      return true;
    } catch (error) {
      logger.error('Failed to initialize Beeper MCP client', { error: error.message });
      throw error;
    }
  }

  /**
   * List available tools from Beeper MCP server
   */
  async listTools() {
    if (!this.isConnected) {
      throw new Error('Beeper MCP client not connected');
    }

    try {
      const response = await this.client.listTools();
      return response.tools || [];
    } catch (error) {
      logger.error('Error listing Beeper tools', { error: error.message });
      throw error;
    }
  }

  /**
   * Fetch recent messages from all platforms
   */
  async getRecentMessages(options = {}) {
    if (!this.isConnected) {
      throw new Error('Beeper MCP client not connected');
    }

    const {
      limit = 50,
      since = null,           // Timestamp to fetch messages after
      platforms = null,       // Filter by platforms: ['imessage', 'whatsapp', etc.]
      roomId = null,          // Specific room/conversation
      unreadOnly = false,
    } = options;

    try {
      logger.info('Fetching recent messages from Beeper', { limit, since, platforms });

      // Call Beeper MCP tool to get messages
      const response = await this.client.callTool({
        name: 'get_messages',
        arguments: {
          limit,
          since,
          platforms,
          room_id: roomId,
          unread_only: unreadOnly,
        },
      });

      const messages = this.parseMessages(response.content);
      logger.info(`Fetched ${messages.length} messages from Beeper`);

      return messages;
    } catch (error) {
      logger.error('Error fetching messages from Beeper', { error: error.message });
      throw error;
    }
  }

  /**
   * Get messages from a specific room/conversation
   */
  async getRoomMessages(roomId, options = {}) {
    const {
      limit = 50,
      before = null,  // Message ID to fetch before (pagination)
    } = options;

    try {
      logger.info(`Fetching messages from room ${roomId}`);

      const response = await this.client.callTool({
        name: 'get_room_messages',
        arguments: {
          room_id: roomId,
          limit,
          before,
        },
      });

      return this.parseMessages(response.content);
    } catch (error) {
      logger.error('Error fetching room messages', { roomId, error: error.message });
      throw error;
    }
  }

  /**
   * Get list of rooms/conversations
   */
  async getRooms(options = {}) {
    const {
      limit = 100,
      hasUnread = null,
    } = options;

    try {
      logger.info('Fetching rooms from Beeper');

      const response = await this.client.callTool({
        name: 'get_rooms',
        arguments: {
          limit,
          has_unread: hasUnread,
        },
      });

      const rooms = this.parseRooms(response.content);
      logger.info(`Fetched ${rooms.length} rooms from Beeper`);

      return rooms;
    } catch (error) {
      logger.error('Error fetching rooms', { error: error.message });
      throw error;
    }
  }

  /**
   * Get contact information
   */
  async getContact(contactId) {
    try {
      const response = await this.client.callTool({
        name: 'get_contact',
        arguments: {
          contact_id: contactId,
        },
      });

      return this.parseContact(response.content);
    } catch (error) {
      logger.error('Error fetching contact', { contactId, error: error.message });
      throw error;
    }
  }

  /**
   * Search messages by text
   */
  async searchMessages(query, options = {}) {
    const {
      limit = 50,
      platforms = null,
      roomId = null,
    } = options;

    try {
      logger.info(`Searching messages for: "${query}"`);

      const response = await this.client.callTool({
        name: 'search_messages',
        arguments: {
          query,
          limit,
          platforms,
          room_id: roomId,
        },
      });

      return this.parseMessages(response.content);
    } catch (error) {
      logger.error('Error searching messages', { query, error: error.message });
      throw error;
    }
  }

  /**
   * Parse messages from MCP response
   */
  parseMessages(content) {
    if (!content || content.length === 0) {
      return [];
    }

    try {
      // MCP content is an array of content blocks
      const textContent = content.find(block => block.type === 'text');
      if (!textContent) {
        return [];
      }

      const data = JSON.parse(textContent.text);
      const messages = data.messages || [];

      // Normalize message format
      return messages.map(msg => this.normalizeMessage(msg));
    } catch (error) {
      logger.error('Error parsing messages', { error: error.message });
      return [];
    }
  }

  /**
   * Parse rooms from MCP response
   */
  parseRooms(content) {
    if (!content || content.length === 0) {
      return [];
    }

    try {
      const textContent = content.find(block => block.type === 'text');
      if (!textContent) {
        return [];
      }

      const data = JSON.parse(textContent.text);
      return data.rooms || [];
    } catch (error) {
      logger.error('Error parsing rooms', { error: error.message });
      return [];
    }
  }

  /**
   * Parse contact from MCP response
   */
  parseContact(content) {
    if (!content || content.length === 0) {
      return null;
    }

    try {
      const textContent = content.find(block => block.type === 'text');
      if (!textContent) {
        return null;
      }

      return JSON.parse(textContent.text);
    } catch (error) {
      logger.error('Error parsing contact', { error: error.message });
      return null;
    }
  }

  /**
   * Normalize message format to match our database schema
   */
  normalizeMessage(message) {
    return {
      id: message.id || message.message_id,
      threadId: message.thread_id || message.room_id,
      roomId: message.room_id,
      platform: message.platform || message.source,
      fromContact: message.sender?.id || message.sender?.phone || message.sender?.username,
      fromName: message.sender?.name || message.sender?.display_name,
      toContact: message.recipient?.id || message.recipient?.phone,
      body: message.text || message.body || '',
      snippet: (message.text || message.body || '').substring(0, 200),
      messageType: message.type || 'text',
      timestamp: message.timestamp || Date.now(),
      date: new Date(message.timestamp || Date.now()).toISOString(),
      hasAttachments: (message.attachments || []).length > 0,
      attachments: JSON.stringify(message.attachments || []),
      isGroupMessage: message.is_group || false,
      participants: JSON.stringify(message.participants || []),
      raw: message, // Keep full original message
    };
  }

  /**
   * Close connection to Beeper MCP server
   */
  async close() {
    try {
      if (this.client && this.isConnected) {
        await this.client.close();
        this.isConnected = false;
        logger.info('Beeper MCP client disconnected');
      }
    } catch (error) {
      logger.error('Error closing Beeper MCP client', { error: error.message });
    }
  }
}

module.exports = BeeperMCPClient;
