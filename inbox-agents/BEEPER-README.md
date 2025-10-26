# 🚀 Beeper AI Agent System

A comprehensive AI-powered system for monitoring, categorizing, and extracting actionable information from all your Beeper messages across multiple platforms (iMessage, WhatsApp, Telegram, Signal, Slack, Discord, and more).

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [Specialized Agents](#specialized-agents)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)

## ✨ Features

### Core Capabilities
- **Multi-Platform Monitoring**: Monitors messages from all Beeper-connected platforms
- **AI-Powered Categorization**: Uses Claude AI to categorize messages into 8 categories
- **Automated Information Extraction**: Extracts events, tasks, job opportunities, and more
- **Smart Spam Detection**: Identifies spam, scams, and phishing attempts
- **Social Relationship Tracking**: Tracks who needs responses and follow-ups
- **Calendar Integration**: Checks if events already exist in Google Calendar

### Message Categories
1. **EVENT**: Meetings, appointments, hangouts
2. **TODO**: Action items, tasks, deadlines
3. **SOCIAL**: Personal conversations, life updates
4. **SPAM**: Unwanted messages, scams
5. **RECRUITMENT**: Job opportunities
6. **FINANCIAL**: Payment requests, bills
7. **URGENT**: Time-sensitive matters
8. **INFORMATIONAL**: News, updates

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Beeper MCP Client                         │
│          (Connects to all messaging platforms)               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  Beeper Monitor Agent                        │
│        (Fetches new messages, saves to database)            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Beeper Message Processor                        │
│         (Claude AI categorizes all messages)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│  Calendar    │         │     TODO     │
│    Agent     │         │    Agent     │
└──────────────┘         └──────────────┘
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│   Social     │         │ Recruitment  │
│    Agent     │         │    Agent     │
└──────────────┘         └──────────────┘
        │                         │
        ▼                         ▼
┌──────────────┐         ┌──────────────┐
│    Spam      │         │   Database   │
│    Agent     │         │   (SQLite)   │
└──────────────┘         └──────────────┘
```

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Beeper account
- Anthropic API key
- (Optional) Google Calendar API credentials

### Step 1: Install Dependencies

```bash
cd inbox-agents
npm install @modelcontextprotocol/sdk
```

The MCP SDK is the only new dependency needed. All other dependencies (Anthropic SDK, googleapis, sqlite3, etc.) are already installed.

### Step 2: Set Up Environment Variables

Create a `.env` file or add to your existing one:

```bash
# Beeper Credentials
BEEPER_USERNAME=your-beeper-username
BEEPER_PASSWORD=your-beeper-password

# Anthropic API (required)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Beeper Settings
BEEPER_CHECK_INTERVAL=5                    # Check for new messages every N minutes
BEEPER_MESSAGES_PER_CHECK=50               # Max messages to fetch per check

# Platforms to monitor (comma-separated, or leave empty for all)
BEEPER_PLATFORMS=imessage,whatsapp,telegram,signal,slack

# Logging
LOG_LEVEL=info                             # debug, info, warn, error
```

### Step 3: Verify File Structure

Ensure all files are in place:

```
inbox-agents/
├── beeper-mcp-client.js                   # MCP client wrapper
├── beeper-database.js                     # Database schema
├── beeper-index.js                        # Main entry point
├── agents/
│   └── core/
│       ├── beeper-monitor.js              # Message monitor
│       └── beeper-processor.js            # Message processor
├── beeper-specialists/
│   ├── beeper-calendar-agent.js           # Calendar extraction
│   ├── beeper-todo-agent.js               # Task extraction
│   ├── beeper-social-agent.js             # Social tracking
│   ├── beeper-recruitment-agent.js        # Job opportunities
│   └── beeper-spam-agent.js               # Spam detection
└── .env
```

## ⚙️ Configuration

### Platform Selection

Monitor specific platforms by setting `BEEPER_PLATFORMS`:

```bash
# Monitor only iMessage and WhatsApp
BEEPER_PLATFORMS=imessage,whatsapp

# Monitor all platforms (leave empty or omit)
BEEPER_PLATFORMS=
```

Supported platforms:
- `imessage` - Apple iMessage
- `whatsapp` - WhatsApp
- `telegram` - Telegram
- `signal` - Signal
- `slack` - Slack
- `discord` - Discord
- `sms` - SMS
- `instagram` - Instagram DMs
- `messenger` - Facebook Messenger

### Check Intervals

- **BEEPER_CHECK_INTERVAL**: How often to check for new messages (default: 5 minutes)
- Specialized agents run every 15 minutes automatically

### Google Calendar Integration

To enable calendar checking (optional):

1. Follow the Gmail setup guide to get Google Calendar API credentials
2. Place `credentials.json` in the `config/` directory
3. The calendar agent will automatically check if events already exist

## 🚀 Usage

### Start the Beeper Agent System

```bash
# From the inbox-agents directory
node beeper-index.js
```

You should see:
```
[INFO] Starting AI Beeper Agent System...
[INFO] Monitoring platforms: imessage,whatsapp,telegram
[INFO] Initializing Beeper Monitor Agent...
[INFO] Connecting to Beeper MCP server...
[INFO] Successfully connected to Beeper MCP server
[INFO] All Beeper agents initialized successfully
[INFO] Running initial check...
```

### Run in Background

```bash
# Using PM2 (recommended)
pm2 start beeper-index.js --name beeper-agent

# Or using nohup
nohup node beeper-index.js > beeper.log 2>&1 &
```

### Add to package.json

```json
{
  "scripts": {
    "beeper": "node beeper-index.js",
    "beeper:dev": "nodemon beeper-index.js"
  }
}
```

Then run:
```bash
npm run beeper
```

## 🤖 Specialized Agents

### 1. Calendar Agent (`beeper-calendar-agent.js`)

**Purpose**: Extracts calendar events from messages

**Extracts**:
- Event name/title
- Date and time
- Location (physical or virtual)
- Attendees
- Meeting links (Zoom, Google Meet, etc.)
- Organizer information

**Features**:
- Checks if event already exists in Google Calendar
- Handles casual meetup language ("coffee tomorrow at 2")
- Parses relative dates ("next Friday", "tomorrow")

**Database**: `beeper_events` table

**Example**:
```
Message: "Hey! Want to grab coffee tomorrow at 2pm at Starbucks?"
Extracted: 
  - Event: "Coffee meetup"
  - Date: 2024-03-16
  - Time: 14:00
  - Location: "Starbucks"
```

### 2. TODO Agent (`beeper-todo-agent.js`)

**Purpose**: Extracts action items and tasks

**Extracts**:
- Task description
- Deadline/due date
- Priority level (urgent/high/medium/low)
- Category (send, review, complete, etc.)
- Estimated time
- Assignee

**Features**:
- Detects implicit tasks ("Don't forget to...")
- Identifies urgency from language
- Tracks multiple tasks per message
- Sorts by priority and deadline

**Database**: `beeper_todos` table

**Example**:
```
Message: "Can you send me the report by Friday? It's urgent!"
Extracted:
  - Task: "Send the report"
  - Deadline: 2024-03-22
  - Priority: urgent
  - Category: send
```

### 3. Social Agent (`beeper-social-agent.js`)

**Purpose**: Tracks social relationships and interactions

**Analyzes**:
- Relationship type (family, friend, colleague, etc.)
- Communication purpose (catch_up, life_event, etc.)
- Life events (birthdays, weddings, babies, etc.)
- Sentiment and tone
- Response requirements
- Follow-up opportunities

**Features**:
- Identifies who needs responses
- Tracks important dates
- Suggests follow-up actions
- Monitors relationship health

**Database**: `beeper_social_interactions`, `beeper_catchup_tracking` tables

**Example**:
```
Message: "Just had a baby girl! Her name is Emma 💕"
Extracted:
  - Life Event: Baby (Emma born 2024-04-15)
  - Sentiment: Positive, excited
  - Requires Response: Yes (congratulations)
  - Important Date: 2024-04-15 (Emma's birthday)
```

### 4. Recruitment Agent (`beeper-recruitment-agent.js`)

**Purpose**: Tracks job opportunities and recruitment

**Extracts**:
- Job title and company
- Location and work mode (remote/hybrid/onsite)
- Salary range
- Required skills
- Application deadline
- Recruiter information
- Application links

**Assesses**:
- Relevance to your profile
- Quality of opportunity
- Legitimacy (detects scams)
- Interest level

**Features**:
- Identifies interview invitations
- Tracks application status
- Flags suspicious opportunities
- Organizes by interest level

**Database**: `beeper_job_opportunities` table

**Example**:
```
Message: "Hi! We have a Senior Engineer role at TechCorp, $140k-$180k, remote"
Extracted:
  - Job: Senior Software Engineer
  - Company: TechCorp
  - Salary: $140k-$180k
  - Work Mode: remote
  - Relevance: high
  - Quality: excellent
```

### 5. Spam Agent (`beeper-spam-agent.js`)

**Purpose**: Detects spam, scams, and phishing

**Detects**:
- Marketing spam
- Phishing attempts
- Scams (crypto, romance, advance-fee)
- Impersonation
- Malware links
- Automated bot messages

**Analyzes**:
- Spam type and severity
- Red flags and indicators
- Danger level (safe/low/medium/high/critical)
- Recommended actions

**Features**:
- Identifies suspicious links
- Detects urgency tactics
- Flags requests for personal info
- Recommends blocking/reporting

**Database**: `beeper_spam_analysis` table

**Example**:
```
Message: "URGENT! You won $1M! Click here now!"
Detected:
  - Spam Type: scam
  - Severity: high
  - Red Flags: Urgency, too-good-to-be-true, suspicious link
  - Recommendation: block_and_report
```

## 🗄️ Database Schema

The system uses SQLite with the following tables:

### Core Tables

**`beeper_messages`**: All messages from all platforms
- Stores: id, platform, room_id, from_contact, body, timestamp, etc.

**`beeper_processed_messages`**: Processing status
- Links to messages with category, urgency, confidence

### Specialized Tables

**`beeper_events`**: Extracted calendar events
**`beeper_todos`**: Extracted tasks
**`beeper_social_interactions`**: Social analysis
**`beeper_job_opportunities`**: Job opportunities
**`beeper_spam_analysis`**: Spam detection results
**`beeper_catchup_tracking`**: Who needs responses
**`beeper_contacts`**: Contact information

## 📊 Querying the Database

### View Recent Messages

```bash
sqlite3 beeper-messages.db "SELECT platform, from_name, body, date FROM beeper_messages ORDER BY timestamp DESC LIMIT 10;"
```

### Get Events Not on Calendar

```bash
sqlite3 beeper-messages.db "SELECT title, event_date, event_time, location FROM beeper_events WHERE is_on_calendar = 0;"
```

### Get Incomplete Tasks

```bash
sqlite3 beeper-messages.db "SELECT task, deadline, priority FROM beeper_todos WHERE completed = 0 ORDER BY deadline;"
```

### Get High-Interest Jobs

```bash
sqlite3 beeper-messages.db "SELECT job_title, company, salary_range FROM beeper_job_opportunities WHERE interest_level = 'high_interest';"
```

### Get People Needing Responses

```bash
sqlite3 beeper-messages.db "SELECT contact_name, platform, message_count_pending, days_since_response FROM beeper_catchup_tracking WHERE requires_response = 1;"
```

### Get Dangerous Messages

```bash
sqlite3 beeper-messages.db "SELECT from_name, spam_type, severity, reasoning FROM beeper_spam_analysis WHERE severity IN ('high', 'critical');"
```

## 🔧 API Reference

### BeeperMCPClient

```javascript
const client = new BeeperMCPClient();
await client.connect();

// Get all rooms
const rooms = await client.getRooms();

// Get recent messages
const messages = await client.getRecentMessages(50);

// Get messages from specific platforms
const messages = await client.getPlatformMessages(['imessage', 'whatsapp'], 50);

// Disconnect
await client.disconnect();
```

### BeeperMonitorAgent

```javascript
const monitor = new BeeperMonitorAgent();
await monitor.initialize();

// Check for new messages
const result = await monitor.monitor();
// Returns: { count, saved, messages }

await monitor.cleanup();
```

### Specialized Agents

```javascript
// Calendar Agent
const calendarAgent = new BeeperCalendarAgent();
await calendarAgent.initialize();
const result = await calendarAgent.processEventMessages();

// TODO Agent
const todoAgent = new BeeperTodoAgent();
const tasks = await todoAgent.getIncompleteTasks();
const overdue = await todoAgent.getOverdueTasks();

// Social Agent
const socialAgent = new BeeperSocialAgent();
const needsResponse = await socialAgent.getMessagesRequiringResponse();
const catchup = await socialAgent.getCatchupNeeds(7); // 7 days threshold

// Recruitment Agent
const recruitmentAgent = new BeeperRecruitmentAgent();
const jobs = await recruitmentAgent.getHighInterestJobs();
const interviews = await recruitmentAgent.getInterviewInvitations();

// Spam Agent
const spamAgent = new BeeperSpamAgent();
const dangerous = await spamAgent.getDangerousMessages();
const toBlock = await spamAgent.getContactsToBlock();
```

## 🐛 Troubleshooting

### Connection Issues

**Problem**: "Failed to connect to Beeper MCP"

**Solutions**:
1. Verify Beeper credentials in `.env`
2. Check if MCP SDK is installed: `npm list @modelcontextprotocol/sdk`
3. Ensure Beeper account is active
4. Check network connectivity

### No Messages Found

**Problem**: "Found 0 new messages"

**Solutions**:
1. Verify `BEEPER_PLATFORMS` setting
2. Check if messages exist in those platforms
3. Verify timestamp tracking in database
4. Try deleting `beeper-messages.db` to start fresh

### Claude API Errors

**Problem**: "ANTHROPIC_API_KEY environment variable is not set"

**Solutions**:
1. Add API key to `.env` file
2. Verify key is valid at console.anthropic.com
3. Check API usage limits

### Database Errors

**Problem**: "UNIQUE constraint failed"

**Solutions**:
- This is normal - it means the message already exists
- The system automatically skips duplicates

### High Memory Usage

**Solutions**:
1. Reduce `BEEPER_MESSAGES_PER_CHECK`
2. Increase `BEEPER_CHECK_INTERVAL`
3. Limit platforms in `BEEPER_PLATFORMS`

## 📈 Performance Tips

1. **Start with specific platforms**: Monitor only the platforms you use most
2. **Adjust check intervals**: Increase interval if you don't need real-time monitoring
3. **Database maintenance**: Periodically archive old messages
4. **Log level**: Set `LOG_LEVEL=warn` in production to reduce log volume

## 🔐 Security Notes

1. **Credentials**: Never commit `.env` file to version control
2. **Database**: Contains message content - keep `beeper-messages.db` secure
3. **API Keys**: Rotate Anthropic API key periodically
4. **Beeper Password**: Use a strong, unique password

## 📝 License

Same as parent project.

## 🤝 Contributing

This is part of the larger inbox-agents system. Follow the same contribution guidelines.

## 📞 Support

For issues specific to Beeper integration, check:
1. Beeper MCP documentation
2. This README
3. System logs in console output

---

**Built with ❤️ using Claude AI and the Model Context Protocol**
