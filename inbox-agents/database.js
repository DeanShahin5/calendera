const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
  constructor(dbPath = './mailmind.db') {
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
        
        console.log('Connected to SQLite database');
        
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
   * Create all necessary tables
   */
  async createTables() {
    const tables = [
      // Main messages table - stores all emails
      `CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        thread_id TEXT,
        from_email TEXT,
        to_email TEXT,
        subject TEXT,
        body TEXT,
        snippet TEXT,
        date TEXT,
        timestamp INTEGER,
        labels TEXT,
        raw_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

      // Events extracted from emails
      `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        title TEXT,
        event_date TEXT,
        event_time TEXT,
        location TEXT,
        attendees TEXT,
        calendar_id TEXT,
        is_on_calendar BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`,

      // Todos/tasks extracted from emails
      `CREATE TABLE IF NOT EXISTS todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        task TEXT,
        deadline TEXT,
        priority TEXT,
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
        FOREIGN KEY (message_id) REFERENCES messages(id)
      )`
    ];

    for (const sql of tables) {
      await this.run(sql);
    }

    console.log('All tables created successfully');
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
   * Insert a message
   */
  async insertMessage(message) {
    const sql = `
      INSERT INTO messages (
        id, thread_id, from_email, to_email, subject, 
        body, snippet, date, timestamp, labels, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      message.id,
      message.threadId,
      message.from,
      message.to,
      message.subject,
      message.body,
      message.snippet,
      message.date,
      message.timestamp,
      JSON.stringify(message.labels),
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
   * Mark message as processed
   */
  async markAsProcessed(messageId, category, urgency, confidence) {
    const sql = `
      INSERT INTO processed_messages (message_id, category, urgency, confidence)
      VALUES (?, ?, ?, ?)
    `;
    return await this.run(sql, [messageId, category, urgency, confidence]);
  }

  /**
   * Insert an event
   */
  async insertEvent(event) {
    const sql = `
      INSERT INTO events (
        message_id, title, event_date, event_time, 
        location, attendees, is_on_calendar
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    
    return await this.run(sql, [
      event.messageId,
      event.title,
      event.date,
      event.time,
      event.location,
      JSON.stringify(event.attendees),
      event.isOnCalendar ? 1 : 0
    ]);
  }

  /**
   * Insert a todo
   */
  async insertTodo(todo) {
    const sql = `
      INSERT INTO todos (
        message_id, task, deadline, priority
      ) VALUES (?, ?, ?, ?)
    `;
    
    return await this.run(sql, [
      todo.messageId,
      todo.task,
      todo.deadline,
      todo.priority
    ]);
  }

  /**
   * Get all events not on calendar
   */
  async getEventsNotOnCalendar() {
    const sql = `
      SELECT e.*, m.subject, m.from_email
      FROM events e
      JOIN messages m ON e.message_id = m.id
      WHERE e.is_on_calendar = 0
      ORDER BY e.event_date ASC
    `;
    return await this.all(sql);
  }

  /**
   * Get all incomplete todos
   */
  async getIncompleteTodos() {
    const sql = `
      SELECT t.*, m.subject, m.from_email
      FROM todos t
      JOIN messages m ON t.message_id = m.id
      WHERE t.completed = 0
      ORDER BY t.deadline ASC
    `;
    return await this.all(sql);
  }

  /**
   * Search messages
   */
  async searchMessages(query) {
    const sql = `
      SELECT * FROM messages
      WHERE subject LIKE ? OR body LIKE ? OR from_email LIKE ?
      ORDER BY timestamp DESC
      LIMIT 50
    `;
    const searchTerm = `%${query}%`;
    return await this.all(sql, [searchTerm, searchTerm, searchTerm]);
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

module.exports = Database;
