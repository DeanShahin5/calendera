# Beeper MCP Integration Guide

## 🚀 Complete Setup for Beeper-Based Inbox Automation

This guide shows you how to build an inbox automation system using **Beeper MCP** instead of Gmail.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Beeper Setup](#beeper-setup)
3. [MCP Server Setup](#mcp-server-setup)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Implementation](#implementation)
7. [Testing](#testing)
8. [Deployment](#deployment)

---

## Prerequisites

### Required Accounts
- ✅ Beeper account (https://beeper.com)
- ✅ Anthropic API key (for Claude AI)
- ✅ Google Calendar API (optional, for calendar integration)

### Software Requirements
- Node.js 18+ or Python 3.9+
- npm or yarn
- Git

---

## Beeper Setup

### Step 1: Get Beeper Account

1. **Sign up** at https://beeper.com
2. **Download** Beeper desktop/mobile app
3. **Connect your platforms:**
   - iMessage
   - WhatsApp
   - Telegram
   - Signal
   - SMS
   - Discord
   - Slack
   - And more...

### Step 2: Enable MCP Access

1. Go to Beeper settings
2. Enable **Developer Mode** or **API Access**
3. Note your **Beeper username** and **credentials**

---

## MCP Server Setup

### What is MCP?

**Model Context Protocol (MCP)** is a standard for connecting AI models to external data sources. Beeper provides an MCP server that exposes your messages.

### Install Beeper MCP Server

```bash
# Install via npm (globally or in project)
npm install -g @beeper/mcp-server

# Or use npx (no installation needed)
npx @beeper/mcp-server
```

### Test MCP Connection

```bash
# Start the MCP server
npx @beeper/mcp-server

# You should see:
# ✓ Beeper MCP Server started
# ✓ Connected to Beeper
# ✓ Available tools: get_messages, get_rooms, search_messages, etc.
```

---

## Installation

### Step 1: Clone/Setup Project

```bash
# Create project directory
mkdir beeper-inbox-automation
cd beeper-inbox-automation

# Initialize npm project
npm init -y
```

### Step 2: Install Dependencies

```bash
# Core dependencies
npm install @modelcontextprotocol/sdk
npm install sqlite3
npm install @anthropic-ai/sdk

# Optional: Google Calendar integration
npm install googleapis
```

### Step 3: Copy Project Files

Copy these files to your project:

```
your-project/
├── agents/
│   ├── beeper-monitor-agent.js      # Monitors Beeper for new messages
│   ├── message-processor-agent.js    # Processes messages with AI
│   └── categorization-agent.js       # Routes to specialist agents
├── clients/
│   └── beeper-mcp-client.js         # Beeper MCP client wrapper
├── database/
│   └── beeper-database.js           # Database for Beeper messages
├── utils/
│   └── logger.js                    # Logging utility
└── index.js                         # Main entry point
```

---

## Configuration

### Environment Variables

Create `.env` file:

```bash
# Beeper Credentials
BEEPER_USERNAME=your-username
BEEPER_PASSWORD=your-password

# Anthropic API (for AI processing)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Google Calendar (optional)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret

# Database
DATABASE_PATH=./beeper-mailmind.db

# Data storage
DATA_PATH=./data
```

### Beeper MCP Configuration

Create `beeper-config.json`:

```json
{
  "platforms": [
    "imessage",
    "whatsapp",
    "telegram",
    "signal",
    "sms"
  ],
  "polling": {
    "interval": 30000,
    "maxMessages": 100
  },
  "filters": {
    "minTimestamp": null,
    "excludeGroups": false,
    "includePlatforms": null
  }
}
```

---

## Implementation

### Complete Workflow Example

```javascript
const BeeperMonitorAgent = require('./agents/beeper-monitor-agent');
const MessageProcessorAgent = require('./agents/message-processor-agent');
const CategorizationAgent = require('./agents/categorization-agent');
const logger = require('./utils/logger');

async function runBeeperAutomation() {
  try {
    logger.info('Starting Beeper Inbox Automation...');

    // Step 1: Initialize Beeper Monitor
    const beeperMonitor = new BeeperMonitorAgent();
    await beeperMonitor.initialize();

    // Step 2: Check for new messages
    const monitorResult = await beeperMonitor.monitor();
    
    if (monitorResult.count === 0) {
      logger.info('No new messages');
      return;
    }

    logger.info(`Found ${monitorResult.count} new messages`);
    logger.info('Platform breakdown:', monitorResult.stats.byPlatform);

    // Step 3: Process messages with AI
    const processor = new MessageProcessorAgent();
    await processor.initialize();
    
    const processorResult = await processor.processMessages();
    logger.info(`Processed ${processorResult.processed} messages`);

    // Step 4: Categorize for specialist agents
    const categorizer = new CategorizationAgent();
    await categorizer.initialize();
    
    const categorizedData = await categorizer.categorizeProcessedMessages();
    logger.info('Categorization complete:', categorizedData.stats);

    // Step 5: Route to specialist agents
    const routing = categorizer.prepareForSpecialistAgents(categorizedData);
    
    // Calendar events
    if (routing.calendarAgent.actionRequired) {
      logger.info(`${routing.calendarAgent.messages.length} events to add to calendar`);
      // await calendarAgent.process(routing.calendarAgent.messages);
    }

    // Todos
    if (routing.todoAgent.actionRequired) {
      logger.info(`${routing.todoAgent.messages.length} tasks to create`);
      // await todoAgent.process(routing.todoAgent.messages);
    }

    // Catchup reminders
    if (routing.catchupAgent && routing.catchupAgent.messages.length > 0) {
      logger.info(`${routing.catchupAgent.messages.length} friends/family need response`);
      // await catchupAgent.process(routing.catchupAgent.messages);
    }

    // Cleanup
    await processor.cleanup();
    await categorizer.cleanup();
    await beeperMonitor.cleanup();

    logger.info('Automation complete!');

  } catch (error) {
    logger.error('Error in automation workflow', { error: error.message });
    throw error;
  }
}

// Run every 5 minutes
setInterval(() => {
  runBeeperAutomation().catch(console.error);
}, 5 * 60 * 1000);

// Run immediately
runBeeperAutomation();
```

---

## Testing

### Test 1: Beeper MCP Connection

```javascript
const BeeperMCPClient = require('./clients/beeper-mcp-client');

async function testConnection() {
  const client = new BeeperMCPClient();
  await client.initialize();
  
  // List available tools
  const tools = await client.listTools();
  console.log('Available tools:', tools);
  
  // Get recent messages
  const messages = await client.getRecentMessages({ limit: 10 });
  console.log(`Fetched ${messages.length} messages`);
  
  await client.close();
}

testConnection();
```

### Test 2: Message Monitoring

```bash
node test-beeper-monitor.js
```

Expected output:
```
✓ Beeper MCP client connected
✓ Found 15 new messages
✓ Platform breakdown:
  - imessage: 8
  - whatsapp: 5
  - telegram: 2
✓ Saved to database
```

### Test 3: AI Processing

```bash
node test-message-processor.js
```

Expected output:
```
✓ Processing 15 messages
✓ Extracted 3 events
✓ Extracted 5 tasks
✓ Categorized 15 messages
  - EVENT: 3
  - TODO: 5
  - SOCIAL: 4
  - CATCHUP: 2
  - INFORMATIONAL: 1
```

---

## Key Differences from Gmail Version

| Aspect | Gmail Version | Beeper Version |
|--------|--------------|----------------|
| **Data Source** | Gmail API | Beeper MCP Server |
| **Message Types** | Email only | Multi-platform chat |
| **Structure** | Subject/Body | Chat messages |
| **Auth** | Google OAuth | Beeper credentials |
| **Real-time** | Polling | WebSocket + Polling |
| **Contacts** | Email addresses | Phone/username/handle |
| **Threading** | Email threads | Chat rooms |

---

## Platform-Specific Features

### iMessage
- Group chats
- Reactions
- Tapbacks
- Read receipts

### WhatsApp
- Group chats
- Voice messages
- Status updates
- Broadcast lists

### Telegram
- Channels
- Bots
- File sharing
- Groups/Supergroups

### Signal
- Disappearing messages
- Group chats
- Note to self

---

## Categories for Chat Messages

Different from email categories:

1. **EVENT** - "Let's meet at 3pm tomorrow"
2. **TODO** - "Don't forget to send the file"
3. **SOCIAL** - General chitchat
4. **CATCHUP** - Friends/family needing response
5. **IMPORTANT** - Boss, family emergencies
6. **RECRUITMENT** - Recruiter messages
7. **INFORMATIONAL** - Delivery notifications, updates

---

## Advanced Features

### 1. Catchup Tracking

```javascript
// Get friends who need responses
const catchupNeeds = await database.getCatchupNeeds(7); // 7 days threshold

catchupNeeds.forEach(contact => {
  console.log(`${contact.from_name}: ${contact.days_since} days since response`);
});
```

### 2. Platform Filtering

```javascript
// Only process messages from specific platforms
const messages = await beeperMonitor.checkPlatformMessages([
  'imessage',
  'whatsapp'
]);
```

### 3. Search Functionality

```javascript
// Search messages by keyword
const results = await beeperMonitor.searchMessages('interview');
```

---

## Deployment

### Option 1: Local Server

```bash
# Run as background process
npm start

# Or with PM2
pm2 start index.js --name "beeper-automation"
```

### Option 2: Cloud Deployment

**Recommended: Railway, Render, or Fly.io**

1. Add `Procfile`:
```
worker: node index.js
```

2. Set environment variables in platform
3. Deploy!

---

## Troubleshooting

### Issue: Can't connect to Beeper MCP

**Solution:**
- Verify Beeper credentials
- Check MCP server is running
- Ensure `@beeper/mcp-server` is installed

### Issue: No messages returned

**Solution:**
- Check `since` timestamp in state file
- Verify platforms are connected in Beeper
- Test with `unreadOnly: false`

### Issue: Database errors

**Solution:**
- Check database file permissions
- Verify all tables exist
- Run `node create-tables.js`

---

## Next Steps

1. ✅ Test Beeper MCP connection
2. ✅ Run monitor agent
3. ✅ Process messages with AI
4. ✅ Implement specialist agents:
   - Calendar Agent
   - Todo Agent
   - Catchup Agent
   - Recruitment Agent
5. ✅ Build web dashboard
6. ✅ Add AI chat interface

---

## Resources

- **Beeper**: https://beeper.com
- **MCP Protocol**: https://modelcontextprotocol.io
- **Anthropic Claude**: https://anthropic.com
- **Google Calendar API**: https://developers.google.com/calendar

---

## Support

For issues or questions:
1. Check this guide
2. Review error logs in `./logs`
3. Test individual components
4. Check Beeper status

---

**Ready to start?** Follow the steps above and you'll have a working Beeper-based inbox automation system! 🚀
