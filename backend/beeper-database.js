const sqlite3 = require('sqlite3').verbose();

class BeeperDatabase {
  constructor(dbPath = './data/beeper-messages.db') {
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
        
        console.log('Connected to Beeper SQLite database');
        
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
      // Main messages table for Beeper messages
      `CREATE TABLE IF NOT EXISTS beeper_messages (
        id TEXT PRIMARY KEY,
        platform TEXT,
        room_id TEXT,
        room_name TEXT,
        from_contact TEXT,
        from_name TEXT,
        body TEXT,
        snippet TEXT,
        date TEXT,
        timestamp INTEGER,
        is_group_message BOOLEAN,
        has_attachments BOOLEAN,
        attachments TEXT,
        participants TEXT,
        raw_data TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Processed messages
      `CREATE TABLE IF NOT EXISTS beeper_processed_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        category TEXT,
        urgency TEXT,
        confidence REAL,
        processed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES beeper_messages(id)
      )`,

      // Events extracted from Beeper messages
      `CREATE TABLE IF NOT EXISTS beeper_events (
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
        FOREIGN KEY (message_id) REFERENCES beeper_messages(id)
      )`,

      // Todos/tasks from Beeper messages
      `CREATE TABLE IF NOT EXISTS beeper_todos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        task TEXT,
        deadline TEXT,
        priority TEXT,
        completed BOOLEAN DEFAULT 0,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES beeper_messages(id)
      )`,

      // Contacts tracking
      `CREATE TABLE IF NOT EXISTS beeper_contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT UNIQUE,
        name TEXT,
        platform TEXT,
        last_message_date TEXT,
        message_count INTEGER DEFAULT 0,
        relationship_type TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Catchup tracking - who needs responses
      `CREATE TABLE IF NOT EXISTS beeper_catchup_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id TEXT,
        contact_name TEXT,
        platform TEXT,
        last_their_message TEXT,
        last_my_response TEXT,
        days_since_response INTEGER,
        message_count_pending INTEGER,
        requires_response BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Job opportunities from Beeper
      `CREATE TABLE IF NOT EXISTS beeper_job_opportunities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        from_contact TEXT,
        communication_type TEXT,
        job_title TEXT,
        company TEXT,
        location TEXT,
        job_type TEXT,
        work_mode TEXT,
        salary_range TEXT,
        experience_level TEXT,
        required_skills TEXT,
        application_deadline TEXT,
        job_description TEXT,
        source_type TEXT,
        recruiter_name TEXT,
        application_link TEXT,
        relevance TEXT,
        quality TEXT,
        legitimacy TEXT,
        interest_level TEXT,
        status TEXT DEFAULT 'new',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES beeper_messages(id)
      )`,

      // Social interactions from Beeper
      `CREATE TABLE IF NOT EXISTS beeper_social_interactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        from_contact TEXT,
        relationship_type TEXT,
        communication_purpose TEXT,
        sentiment_tone TEXT,
        requires_response BOOLEAN,
        response_urgency TEXT,
        life_events TEXT,
        important_dates TEXT,
        key_topics TEXT,
        follow_up_opportunities TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES beeper_messages(id)
      )`,

      // Spam analysis from Beeper
      `CREATE TABLE IF NOT EXISTS beeper_spam_analysis (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT,
        from_contact TEXT,
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
        FOREIGN KEY (message_id) REFERENCES beeper_messages(id)
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
   * Insert a Beeper message
   */
  async insertMessage(message) {
    const sql = `
      INSERT INTO beeper_messages (
        id, platform, room_id, room_name, from_contact, from_name,
        body, snippet, date, timestamp, is_group_message,
        has_attachments, attachments, participants, raw_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      message.id,
      message.platform,
      message.roomId,
      message.roomName,
      message.from_contact,
      message.from_name,
      message.body,
      message.body ? message.body.substring(0, 200) : '',
      message.date,
      message.timestamp,
      message.is_group_message ? 1 : 0,
      message.has_attachments ? 1 : 0,
      JSON.stringify(message.attachments),
      JSON.stringify(message.participants),
      JSON.stringify(message.raw)
    ];

    try {
      await this.run(sql, params);
      return message.id;
    } catch (error) {
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
      SELECT m.* FROM beeper_messages m
      LEFT JOIN beeper_processed_messages pm ON m.id = pm.message_id
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
      INSERT INTO beeper_processed_messages (message_id, category, urgency, confidence)
      VALUES (?, ?, ?, ?)
    `;
    return await this.run(sql, [messageId, category, urgency, confidence]);
  }

  /**
   * Insert an event
   */
  async insertEvent(event) {
    const sql = `
      INSERT INTO beeper_events (
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
      INSERT INTO beeper_todos (
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
      SELECT e.*, m.from_name, m.platform
      FROM beeper_events e
      JOIN beeper_messages m ON e.message_id = m.id
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
      SELECT t.*, m.from_name, m.platform
      FROM beeper_todos t
      JOIN beeper_messages m ON t.message_id = m.id
      WHERE t.completed = 0
      ORDER BY t.deadline ASC
    `;
    return await this.all(sql);
  }

  /**
   * Update catchup tracking
   */
  async updateCatchupTracking(contactId, contactName, platform) {
    const existing = await this.get(
      'SELECT * FROM beeper_catchup_tracking WHERE contact_id = ?',
      [contactId]
    );

    if (existing) {
      await this.run(`
        UPDATE beeper_catchup_tracking 
        SET message_count_pending = message_count_pending + 1,
            updated_at = CURRENT_TIMESTAMP,
            last_their_message = CURRENT_TIMESTAMP
        WHERE contact_id = ?
      `, [contactId]);
    } else {
      await this.run(`
        INSERT INTO beeper_catchup_tracking (
          contact_id, contact_name, platform, last_their_message,
          days_since_response, message_count_pending
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, 0, 1)
      `, [contactId, contactName, platform]);
    }
  }

  /**
   * Get contacts needing catchup
   */
  async getCatchupNeeds(daysThreshold = 7) {
    const sql = `
      SELECT * FROM beeper_catchup_tracking
      WHERE requires_response = 1
        AND julianday('now') - julianday(last_their_message) >= ?
      ORDER BY days_since_response DESC
    `;
    return await this.all(sql, [daysThreshold]);
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
          console.log('Beeper database connection closed');
          resolve();
        }
      });
    });
  }
}

module.exports = BeeperDatabase;
