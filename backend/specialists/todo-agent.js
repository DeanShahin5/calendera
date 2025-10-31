const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');
const Database = require('../database');

class TodoAgent {
  constructor() {
    this.anthropic = null;
    this.db = new Database();
  }

  /**
   * Initialize the agent
   */
  async initialize() {
    try {
      logger.info('Initializing TODO Agent...');

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

      logger.info('TODO Agent initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize TODO Agent', { error: error.message });
      throw error;
    }
  }

  /**
   * Process a message and extract TODO/task information
   * @param {Object} message - Processed message object
   * @returns {Object} Extracted task data with confidence scores
   */
  async extractTasks(message) {
    try {
      logger.info(`Extracting tasks from message: ${message.subject}`);

      // Build specialized prompt for task extraction
      const prompt = this.buildTodoPrompt(message);

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
      
      const taskData = JSON.parse(cleanedText);

      logger.info('Task extraction complete', {
        messageId: message.id,
        hasTasks: taskData.hasTasks,
        taskCount: taskData.tasks ? taskData.tasks.length : 0,
        confidence: taskData.confidence
      });

      return taskData;
    } catch (error) {
      logger.error('Failed to extract tasks from message', {
        messageId: message.id,
        subject: message.subject,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Build specialized prompt for task/TODO extraction
   */
  buildTodoPrompt(message) {
    return `You are a specialized task and action item extraction AI. Your task is to analyze an email and extract all actionable tasks, to-dos, and deadlines.

Email Details:
From: ${message.from_email}
To: ${message.to_email}
Subject: ${message.subject}
Date: ${message.date}
Body:
${message.body}

Your task is to:
1. Identify ALL actionable items, tasks, and to-dos in this email
2. Extract deadlines, due dates, and time-sensitive information
3. Determine priority levels based on urgency and importance
4. Identify task dependencies or prerequisites
5. Assign confidence scores to each extraction

Look for:
- Direct action requests: "Please submit...", "Can you...", "Need you to..."
- Implicit tasks: "The report is due...", "Don't forget to..."
- Deadlines: "by Friday", "before EOD", "due on..."
- Follow-ups: "Let me know...", "Send me..."
- Approvals needed: "Please review...", "Approve..."
- Meetings to schedule: "We should meet...", "Let's discuss..."

For each task, extract:
- **Task Description**: Clear, actionable description
- **Deadline**: Due date in YYYY-MM-DD format (null if not specified)
- **Priority**: "low", "medium", "high", or "urgent"
- **Category**: Type of task (e.g., "review", "submit", "respond", "schedule", "approve")
- **Estimated Time**: Rough time estimate if mentioned (e.g., "30 minutes", "2 hours")
- **Dependencies**: Other tasks that must be completed first
- **Assignee**: Who should do this (if it's you, use "me")
- **Confidence**: Score from 0.0 to 1.0 for this task extraction

Priority Guidelines:
- **urgent**: Explicit urgency words (ASAP, urgent, critical) or deadline within 24 hours
- **high**: Deadline within 3 days or important requests from managers/clients
- **medium**: Deadline within 1-2 weeks or standard requests
- **low**: No deadline or long-term tasks

Return ONLY a valid JSON object with no additional text. Format:

{
  "hasTasks": true,
  "confidence": 0.92,
  "tasks": [
    {
      "description": "Submit quarterly financial report",
      "deadline": "2024-03-20",
      "priority": "high",
      "category": "submit",
      "estimatedTime": "2 hours",
      "dependencies": ["Gather data from finance team"],
      "assignee": "me",
      "confidence": 0.95
    },
    {
      "description": "Review and approve marketing proposal",
      "deadline": "2024-03-18",
      "priority": "medium",
      "category": "approve",
      "estimatedTime": "30 minutes",
      "dependencies": null,
      "assignee": "me",
      "confidence": 0.88
    }
  ]
}

If no tasks are found:
{
  "hasTasks": false,
  "confidence": 0.90,
  "tasks": []
}`;
  }

  /**
   * Process all unprocessed TODO category messages
   * @returns {Object} Processing results
   */
  async processTodoMessages() {
    try {
      logger.info('Processing TODO messages...');

      // Get all processed messages with TODO category that haven't been analyzed by todo agent
      const messages = await this.db.all(`
        SELECT m.*, pm.category, pm.confidence as category_confidence
        FROM messages m
        JOIN processed_messages pm ON m.id = pm.message_id
        LEFT JOIN todos t ON m.id = t.message_id
        WHERE pm.category = 'TODO' AND t.id IS NULL
        ORDER BY m.timestamp DESC
        LIMIT 50
      `);

      logger.info(`Found ${messages.length} TODO messages to process`);

      let processedCount = 0;
      let tasksExtracted = 0;

      for (const message of messages) {
        try {
          const result = await this.extractTasks(message);

          if (result.hasTasks && result.tasks && result.tasks.length > 0) {
            // Save each task to database
            for (const task of result.tasks) {
              await this.db.insertTodo({
                messageId: message.id,
                task: task.description,
                deadline: task.deadline,
                priority: task.priority
              });

              tasksExtracted++;
              logger.info(`Extracted task: ${task.description} (Priority: ${task.priority})`);
            }
          }

          processedCount++;
        } catch (error) {
          logger.error(`Failed to process TODO message ${message.id}`, {
            messageId: message.id,
            subject: message.subject,
            error: error.message
          });
        }
      }

      return {
        processed: processedCount,
        tasksExtracted: tasksExtracted
      };
    } catch (error) {
      logger.error('Error in processTodoMessages', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all incomplete tasks sorted by priority and deadline
   * @returns {Array} List of incomplete tasks
   */
  async getIncompleteTasks() {
    try {
      const tasks = await this.db.getIncompleteTodos();
      
      // Sort by priority and deadline
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      
      tasks.sort((a, b) => {
        // First by priority
        const priorityDiff = (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3);
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then by deadline
        if (a.deadline && b.deadline) {
          return new Date(a.deadline) - new Date(b.deadline);
        }
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        
        return 0;
      });
      
      return tasks;
    } catch (error) {
      logger.error('Error getting incomplete tasks', { error: error.message });
      throw error;
    }
  }

  /**
   * Get overdue tasks
   * @returns {Array} List of overdue tasks
   */
  async getOverdueTasks() {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      const tasks = await this.db.all(`
        SELECT t.*, m.subject, m.from_email
        FROM todos t
        JOIN messages m ON t.message_id = m.id
        WHERE t.completed = 0 
          AND t.deadline IS NOT NULL 
          AND t.deadline < ?
        ORDER BY t.deadline ASC
      `, [today]);
      
      return tasks;
    } catch (error) {
      logger.error('Error getting overdue tasks', { error: error.message });
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

module.exports = TodoAgent;