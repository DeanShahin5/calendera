const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Database for Beeper Message Management
 * Updated to handle messages from multiple platforms via Beeper
 */
class BeeperDatabase {
  constructor(dbPath = './beeper-mailmind.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  /**
   * Initialize database and create tables
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, async (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        console.log('Connected to Beeper database');
        
        try {
          await this.createTables();
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Create all necessary tables for Beeper integration
   */
  async createTables() {
    const tables = [
      // Main messages table - stores messages from all platforms
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT,
        room_id TEXT,
        platform TEXT,
        from_contact TEXT,
        from_name TEXT,
        to_contact TEXT,
        body TEXT,
        snippet TEXT,
        message_type TEXT,
        timestamp INTEGER,
        date TEXT,
        has_attachments BOOLEAN DEFAULT 0,
        attachments TEXT,
        is_group_message BOOLEAN DEFAULT 0,
        participants TEXT,
        raw_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_platform (platform),
        INDEX idx_room_id (room_id),
        INDEX idx_timestamp (timestamp),
        INDEX idx_from_contact (from_contact)
      )`,

      // Contacts table - people you message with
      `CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT UNIQUE,
        name TEXT,
        phone TEXT,
        email TEXT,
        username TEXT,
        platform TEXT,
        avatar_url TEXT,
        relationship TEXT,
        last_message_at DATETIME,
        message_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_contact_id (contact_id),
        INDEX idx_relationship (relationship)
      )`,

      // Rooms/Conversations table
      `CREATE TABLE IF NOT EXISTS rooms (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_id TEXT UNIQUE,
        platform TEXT,
        name TEXT,
        is_group BOOLEAN DEFAULT 0,
        participants TEXT,
        last_activity DATETIME,
        unread_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_room_id (room_id),
        INDEX idx_platform (platform)
      )`,

      // Processed messages - tracks AI processing status
      `CREATE TABLE IF NOT EXISTS processed_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        category TEXT,
        urgency TEXT,
        confidence REAL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`,

      // Events extracted from messages
      `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        title TEXT,
        event_date TEXT,
        event_time TEXT,
        location TEXT,
        attendees TEXT,
        platform TEXT,
        room_id TEXT,
        calendar_id TEXT,
        is_on_calendar BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`,

      // Todos/tasks extracted from messages
      `CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        task TEXT,
        deadline TEXT,
        priority TEXT,
        platform TEXT,
        contact TEXT,
        completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`,

      // Categories - track all categorizations
      `CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        category TEXT,
        subcategory TEXT,
        confidence REAL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id),
        
        INDEX idx_category (category)
      )`,

      // Catchup tracking - friends/family needing responses
      `CREATE TABLE IF NOT EXISTS catchup_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT,
        contact_name TEXT,
        last_responded DATETIME,
        days_since_response INTEGER,
        message_count INTEGER DEFAULT 0,
        relationship TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_contact_id (contact_id),
        INDEX idx_days_since (days_since_response)
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    console.log('All Beeper tables created successfully');
  }

  /**
   * Run a SQL query
   */
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  /**
   * Get a single row
   */
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Get all rows
   */
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Insert a message from Beeper
   */
  async insertMessage(message) {
    const sql = `
      INSERT INTO messages (
        id, thread_id, room_id, platform, from_contact, from_name,
        to_contact, body, snippet, message_type, timestamp, date,
        has_attachments, attachments, is_group_message, participants, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      message.id,
      message.threadId,
      message.roomId,
      message.platform,
      message.fromContact,
      message.fromName,
      message.toContact,
      message.body,
      message.snippet,
      message.messageType,
      message.timestamp,
      message.date,
      message.hasAttachments ? 1 : 0,
      message.attachments,
      message.isGroupMessage ? 1 : 0,
      message.participants,
      JSON.stringify(message.raw)
    ];

    try {
      await this.run(sql, params);
      return message.id;
    } catch (error) {
      // If duplicate, just skip
      if (error.message.includes('UNIQUE constraint failed')) {
        console.log(`Message ${message.id} already exists, skipping`);
        return message.id;
      }
      throw error;
    }
  }

  /**
   * Insert or update a contact
   */
  async upsertContact(contact) {
    const sql = `
      INSERT INTO contacts (
        contact_id, name, phone, email, username, platform, 
        avatar_url, relationship, last_message_at, message_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(contact_id) DO UPDATE SET
        name = excluded.name,
        phone = excluded.phone,
        email = excluded.email,
        username = excluded.username,
        last_message_at = excluded.last_message_at,
        message_count = message_count + 1
    `;

    return await this.run(sql, [
      contact.contactId,
      contact.name,
      contact.phone,
      contact.email,
      contact.username,
      contact.platform,
      contact.avatarUrl,
      contact.relationship,
      contact.lastMessageAt,
      1
    ]);
  }

  /**
   * Insert or update a room
   */
  async upsertRoom(room) {
    const sql = `
      INSERT INTO rooms (
        room_id, platform, name, is_group, participants, 
        last_activity, unread_count
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(room_id) DO UPDATE SET
        name = excluded.name,
        last_activity = excluded.last_activity,
        unread_count = excluded.unread_count
    `;

    return await this.run(sql, [
      room.roomId,
      room.platform,
      room.name,
      room.isGroup ? 1 : 0,
      JSON.stringify(room.participants),
      room.lastActivity,
      room.unreadCount
    ]);
  }

  /**
   * Get all unprocessed messages
   */
  async getUnprocessedMessages() {
    const sql = `
      SELECT m.* FROM messages m
      LEFT JOIN processed_messages pm ON m.id = pm.message_id
      WHERE pm.message_id IS NULL
      ORDER BY m.timestamp DESC
    `;
    return await this.all(sql);
  }

  /**
   * Get messages by platform
   */
  async getMessagesByPlatform(platform, limit = 100) {
    const sql = `
      SELECT * FROM messages
      WHERE platform = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    return await this.all(sql, [platform, limit]);
  }

  /**
   * Get messages from specific contact
   */
  async getMessagesByContact(contactId, limit = 50) {
    const sql = `
      SELECT * FROM messages
      WHERE from_contact = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    return await this.all(sql, [contactId, limit]);
  }

  /**
   * Get messages in a room
   */
  async getMessagesByRoom(roomId, limit = 100) {
    const sql = `
      SELECT * FROM messages
      WHERE room_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    return await this.all(sql, [roomId, limit]);
  }

  /**
   * Track catchup needs - friends/family who haven't heard from you
   */
  async getCatchupNeeds(daysThreshold = 7) {
    const sql = `
      SELECT 
        from_contact,
        from_name,
        MAX(timestamp) as last_message_time,
        COUNT(*) as message_count,
        (julianday('now') - julianday(MAX(date))) as days_since
      FROM messages
      WHERE platform IN ('imessage', 'whatsapp', 'telegram')
        AND is_group_message = 0
      GROUP BY from_contact
      HAVING days_since > ?
      ORDER BY days_since DESC
    `;
    return await this.all(sql, [daysThreshold]);
  }

  /**
   * Get recruitment-related messages
   */
  async getRecruitmentMessages() {
    const sql = `
      SELECT m.*, pm.category
      FROM messages m
      INNER JOIN processed_messages pm ON m.id = pm.message_id
      WHERE pm.category = 'RECRUITMENT'
      ORDER BY m.timestamp DESC
    `;
    return await this.all(sql);
  }

  /**
   * Close database connection
   */
  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database connection closed');
          resolve();
        }
      });
    });
  }
}

module.exports = BeeperDatabase;
