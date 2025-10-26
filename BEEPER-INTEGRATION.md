# Beeper Integration Guide

This document explains how the Beeper SMS/iMessage integration works with the Calendera dashboard and chatbot.

## Overview

Beeper integration allows Calendera to:
- Monitor messages from iMessage, WhatsApp, Telegram, Signal, Slack, Discord, SMS, Instagram, and Messenger
- Categorize messages using AI (EVENT, TODO, SOCIAL, SPAM, RECRUITMENT, FINANCIAL, URGENT, INFORMATIONAL)
- Display messages in the dashboard
- Query messages via the AI chatbot
- Extract events and tasks from messaging platforms

## Architecture

### Separate Systems
Beeper runs as a **completely separate system** from Gmail monitoring:
- **Gmail system**: `inbox-agents/index.js` → stores in `inbox-agents/mailmind.db`
- **Beeper system**: `inbox-agents/beeper-index.js` → stores in `inbox-agents/beeper-messages.db`

Both systems must be started separately to collect data.

### Database Structure
Beeper uses its own SQLite database with 9 tables:
- `beeper_messages` - Raw messages from all platforms
- `beeper_processed_messages` - AI categorization results
- `beeper_events` - Extracted calendar events
- `beeper_todos` - Extracted tasks
- `beeper_contacts` - Contact information
- `beeper_catchup_tracking` - Tracks who needs responses
- `beeper_job_opportunities` - Job opportunities from messages
- `beeper_social_interactions` - Social relationship tracking
- `beeper_spam_analysis` - Spam detection results

## Prerequisites

1. **Beeper Account**: You need an active Beeper account
2. **MCP SDK**: Install the Model Context Protocol SDK
3. **Anthropic API Key**: Required for AI categorization (already configured)
4. **Environment Variables**: Beeper credentials

## Setup Instructions

### Step 1: Install MCP SDK

```bash
cd inbox-agents
npm install @modelcontextprotocol/sdk
```

### Step 2: Configure Environment Variables

Add to your `.env` file:

```bash
# Beeper Credentials
BEEPER_USERNAME=your-beeper-username
BEEPER_PASSWORD=your-beeper-password

# Beeper Settings
BEEPER_CHECK_INTERVAL=5                    # Check for new messages every N minutes
BEEPER_MESSAGES_PER_CHECK=50               # Max messages to fetch per check

# Platforms to monitor (comma-separated, or leave empty for all)
BEEPER_PLATFORMS=imessage,whatsapp,telegram,signal,slack

# Logging
LOG_LEVEL=info                             # debug, info, warn, error
```

**Note**: Your `ANTHROPIC_API_KEY` is already configured in the `.env` file.

### Step 3: Start the Beeper Agent

You have three options:

#### Option A: Run in Foreground (for testing)
```bash
cd inbox-agents
node beeper-index.js
```

#### Option B: Run in Background (recommended)
```bash
# Using PM2
pm2 start inbox-agents/beeper-index.js --name beeper-agent

# Or using nohup
nohup node inbox-agents/beeper-index.js > beeper.log 2>&1 &
```

#### Option C: Add to package.json scripts
```json
{
  "scripts": {
    "beeper": "node inbox-agents/beeper-index.js",
    "beeper:dev": "nodemon inbox-agents/beeper-index.js"
  }
}
```

Then run: `npm run beeper`

### Step 4: Verify It's Working

You should see output like:
```
[INFO] Starting AI Beeper Agent System...
[INFO] Monitoring platforms: imessage,whatsapp,telegram
[INFO] Initializing Beeper Monitor Agent...
[INFO] Connecting to Beeper MCP server...
[INFO] Successfully connected to Beeper MCP server
[INFO] All Beeper agents initialized successfully
[INFO] Running initial check...
```

Check that the database was created:
```bash
ls -lh inbox-agents/beeper-messages.db
```

## Frontend Integration

### Dashboard UI

The dashboard now includes a new "SMS/iMessage" section that displays:
- Platform-specific emoji icons (💬 iMessage, 💚 WhatsApp, etc.)
- Sender name and platform
- Message snippet
- Category and urgency indicators

**Filter**: Use the filter dropdown to show/hide the "SMS/iMessage" category.

**Empty State**: If no messages are found, the dashboard shows:
> "No messages found. Run beeper-index.js to start collecting SMS/iMessage data."

### Chatbot Integration

The AI chatbot can now query Beeper messages using natural language:

**Examples**:
- "Show me recent iMessages"
- "Any important messages from WhatsApp?"
- "What spam did I get on Telegram?"
- "Show social messages from Signal"

**Tool**: `query_beeper_messages`
- Filter by **platform**: imessage, whatsapp, telegram, signal, slack, discord, sms, instagram, messenger
- Filter by **category**: EVENT, TODO, SOCIAL, SPAM, RECRUITMENT, FINANCIAL, URGENT, INFORMATIONAL
- Search by **sender**: partial name or contact match
- **Limit**: max number of results (default 20)

## API Endpoints

Three new API endpoints were created:

### GET /api/beeper-messages
Retrieves recent Beeper messages with categorization.

**Response**:
```json
{
  "success": true,
  "messages": [
    {
      "id": "msg-123",
      "platform": "imessage",
      "from_name": "John Doe",
      "from_contact": "+1234567890",
      "body": "Hey, want to grab coffee tomorrow at 2pm?",
      "snippet": "Hey, want to grab coffee...",
      "date": "2025-10-26",
      "timestamp": 1729958400,
      "category": "SOCIAL",
      "urgency": "medium"
    }
  ]
}
```

### GET /api/beeper-events
Retrieves calendar events extracted from Beeper messages.

**Response**:
```json
{
  "success": true,
  "events": [
    {
      "id": 1,
      "title": "Coffee with John",
      "event_date": "2025-10-27",
      "event_time": "14:00",
      "location": "Starbucks",
      "platform": "imessage",
      "from_name": "John Doe"
    }
  ]
}
```

### GET /api/beeper-todos
Retrieves tasks extracted from Beeper messages.

**Response**:
```json
{
  "success": true,
  "todos": [
    {
      "id": 1,
      "task": "Send report to client",
      "deadline": "2025-10-28",
      "priority": "high",
      "platform": "slack",
      "from_name": "Boss"
    }
  ]
}
```

## Platform Support

Beeper integration supports 9 messaging platforms:

| Platform | Emoji | Description |
|----------|-------|-------------|
| iMessage | 💬 | Apple iMessage |
| WhatsApp | 💚 | WhatsApp |
| Telegram | ✈️ | Telegram |
| Signal | 🔵 | Signal |
| Slack | 💼 | Slack |
| Discord | 🎮 | Discord |
| SMS | 📱 | SMS |
| Instagram | 📷 | Instagram DMs |
| Messenger | 💌 | Facebook Messenger |

## Message Categories

Beeper AI categorizes messages into 8 categories:

1. **EVENT** - Meetings, appointments, hangouts
2. **TODO** - Action items, tasks, deadlines
3. **SOCIAL** - Personal conversations, life updates
4. **SPAM** - Unwanted messages, scams
5. **RECRUITMENT** - Job opportunities
6. **FINANCIAL** - Payment requests, bills
7. **URGENT** - Time-sensitive matters
8. **INFORMATIONAL** - News, updates

## Running Both Systems

To monitor both Gmail and Beeper simultaneously:

### Terminal 1: Gmail Agent
```bash
cd inbox-agents
node index.js
```

### Terminal 2: Beeper Agent
```bash
cd inbox-agents
node beeper-index.js
```

Or use PM2 to manage both:
```bash
pm2 start inbox-agents/index.js --name gmail-agent
pm2 start inbox-agents/beeper-index.js --name beeper-agent
pm2 status
```

## Troubleshooting

### "Beeper database not initialized"
**Problem**: Dashboard or chatbot shows this message.

**Solution**: The Beeper agent has never been run. Start it with:
```bash
node inbox-agents/beeper-index.js
```

### "No messages found"
**Problem**: Beeper is running but no messages appear.

**Solutions**:
1. Check `BEEPER_PLATFORMS` in `.env` - make sure it includes platforms you use
2. Verify Beeper credentials are correct
3. Check logs for connection errors
4. Ensure messages exist in those platforms

### "Failed to connect to Beeper MCP"
**Problem**: Connection to Beeper service fails.

**Solutions**:
1. Verify Beeper credentials in `.env`
2. Check if MCP SDK is installed: `npm list @modelcontextprotocol/sdk`
3. Ensure Beeper account is active
4. Check network connectivity

### Database Conflicts
**Problem**: Database locked or in use.

**Solution**: Make sure only one instance of beeper-index.js is running:
```bash
# Check for running processes
ps aux | grep beeper-index

# Kill duplicates if found
pm2 delete beeper-agent
```

## Performance Tips

1. **Start with specific platforms**: Monitor only the platforms you use most
   ```bash
   BEEPER_PLATFORMS=imessage,whatsapp
   ```

2. **Adjust check intervals**: Increase interval if you don't need real-time monitoring
   ```bash
   BEEPER_CHECK_INTERVAL=15  # Check every 15 minutes instead of 5
   ```

3. **Limit message count**: Reduce messages per check to save API calls
   ```bash
   BEEPER_MESSAGES_PER_CHECK=20  # Fetch 20 instead of 50
   ```

4. **Log level**: Set to `warn` in production to reduce log volume
   ```bash
   LOG_LEVEL=warn
   ```

## Files Modified/Created

### New Files
- `/app/api/beeper-messages/route.ts` - API endpoint for Beeper messages
- `/app/api/beeper-events/route.ts` - API endpoint for Beeper events
- `/app/api/beeper-todos/route.ts` - API endpoint for Beeper todos
- `BEEPER-INTEGRATION.md` - This documentation file

### Modified Files
- `/app/dashboard/page.tsx` - Added Beeper messages section and filter
- `/app/api/chat/route.ts` - Added `query_beeper_messages` tool for chatbot

### Existing Beeper Files (from teammate)
- `/inbox-agents/beeper-index.js` - Main entry point
- `/inbox-agents/beeper-database.js` - Database schema
- `/inbox-agents/beeper-mcp-client.js` - MCP client wrapper
- `/inbox-agents/agents/core/beeper-monitor.js` - Message monitor
- `/inbox-agents/agents/core/beeper-processor.js` - Message processor
- `/inbox-agents/beeper-specialists/` - 5 specialized agents

## Security Notes

1. **Credentials**: Never commit `.env` file to version control
2. **Database**: `beeper-messages.db` is in `.gitignore` and contains message content
3. **API Keys**: Keep your Anthropic API key secure
4. **Beeper Password**: Use a strong, unique password

## Next Steps

1. **Set up Beeper credentials** in `.env` file
2. **Install MCP SDK**: `npm install @modelcontextprotocol/sdk`
3. **Start Beeper agent**: `node inbox-agents/beeper-index.js`
4. **Verify data collection** in dashboard
5. **Test chatbot queries** for Beeper messages

## Support

For issues specific to:
- **Beeper integration**: See `/inbox-agents/BEEPER-README.md`
- **Frontend integration**: Check this file
- **Chatbot queries**: See `/app/api/chat/route.ts`
