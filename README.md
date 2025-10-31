# Calendera — AI-Powered Unified Inbox

**Cal Hacks '25**
Developed by Dean Shahin, Naisha Jain, Kevin Nguyen, Vamika Singhal.

Calendera is an AI-powered communication hub that consolidates messages from Gmail, Slack, Discord, iMessage, WhatsApp, and more into one intelligent dashboard. Using Claude AI, it automatically categorizes messages, extracts calendar events and tasks, and helps you manage your digital life—all in one place.

---

## Problem

Managing multiple communication platforms is overwhelming:

- **Gmail, Slack, Discord, iMessage, WhatsApp, Telegram** — all separate apps
- Important messages like "let's meet tomorrow at 3pm" get buried in noise
- Manually extracting events and tasks from messages is tedious
- No central place to see what actually matters

Key challenges:

- Context switching between 10+ apps daily
- Missing important events hidden in casual messages
- Drowning in spam, marketing, and low-priority notifications
- No way to quickly ask "what's on my schedule today?"

---

## 💡 Solution

Calendera uses **Claude AI** to read your messages and automatically organize your digital life.

Connect your accounts, and Calendera:
- **Categorizes every message** into Events, Todos, Social, Recruitment, Spam, etc.
- **Extracts calendar events** from natural language ("coffee tomorrow at 3?" → calendar entry)
- **Finds action items** and deadlines ("send that report by Friday" → todo list)
- **Answers questions** via AI chatbot ("What's on my schedule?", "Any urgent tasks?")

All platforms in one dashboard. All information auto-organized. All accessible through natural language.

---

## Core Features

### Multi-Platform Consolidation
- **Gmail** - Full email inbox access
- **Beeper Integration** - iMessage, WhatsApp, Telegram, Signal, Slack, Discord, SMS, Instagram DMs, Messenger
- Auto-syncs every 5 minutes

### AI-Powered Categorization
Claude Sonnet 4.5 reads your messages and sorts them:
-  **Events** — Meetings, hangouts, appointments
-  **Todos** — Action items with deadlines and priority
-  **Social** — Personal conversations, life updates
-  **Recruitment** — Job opportunities
-  **Spam** — Marketing and phishing (auto-detected)
-  **Urgent** — Time-sensitive messages
-  **Financial** — Bills, payments, receipts
-  **Info** — Newsletters, updates

### Calendar Integration
- Understands relative dates: "tomorrow at 3pm", "next Friday"
- One-click add to Google Calendar
- Auto-detects conflicts with existing events

### Chatbot
Natural language AI assistant:
- "What's on my schedule today?"
- "Show me urgent tasks"
- "Any job emails this week?"
- "Create event for coffee tomorrow at 2pm"
- "Tell mom dinner for tomorrow sounds great"
- Markdown-formatted responses with conversation memory

### ✅ Task Management
- Auto-groups by deadline: Overdue / Today / This Week / Later
- Priority indicators based on message urgency
- One-click complete/incomplete
- Extracts time estimates from messages

---

## Impact

**For busy professionals:**
- Save hours daily by eliminating app switching
- Never miss important events hidden in messages
- Focus on what matters — AI filters the noise

**For students:**
- Track assignments and deadlines automatically
- Organize group project messages across platforms
- Keep social, academic, and recruitment separate

**For job seekers:**
- Auto-categorize recruitment emails
- Extract interview times and deadlines
- Track application status across platforms

Calendera helps you stay organized, focused, and in control of your digital life.

---

## Tech Stack

**Frontend:**
- Next.js 16 with App Router
- React 19 with TypeScript
- Tailwind CSS v4
- Anthropic SDK (Claude AI)

**Backend:**
- Node.js monitoring agents
- SQLite databases (Gmail + Beeper)
- Google Gmail & Calendar APIs
- Model Context Protocol (Beeper integration)
- Scheduled monitoring (node-cron)

**AI:**
- Claude Sonnet 4.5 for categorization, entity extraction, and conversational AI

---

## Quick Start

### Prerequisites
- Node.js 18+
- Google account
- [Anthropic API key](https://console.anthropic.com)
- Beeper account (optional, for SMS/iMessage)

### Installation

```bash
# Clone repo
git clone https://github.com/yourusername/calendera.git
cd calendera

# Install all dependencies
npm run install:all

# Or install individually:
# cd frontend && npm install
# cd backend && npm install
```

### Setup Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Add your ANTHROPIC_API_KEY to .env.local
```

### Setup Backend

```bash
cd backend
cp .env.example .env
# Add ANTHROPIC_API_KEY to .env
```

### Google OAuth Setup

1. [Google Cloud Console](https://console.cloud.google.com/) → Create project
2. Enable Gmail API + Google Calendar API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download as `credentials.json` → move to `backend/`
5. Run `node index.js` in `backend/` to authorize

### Run

```bash
# From root directory:

# Terminal 1: Frontend
npm run dev:frontend
# Open http://localhost:3000

# Terminal 2: Gmail Monitor
npm run start:backend

# Terminal 3 (optional): Beeper Monitor
npm run start:backend:beeper
```

Or run individually:

```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && npm run start

# Beeper
cd backend && npm run beeper
```

---

## Environment Variables

**Frontend (`frontend/.env.local`):**
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Backend (`backend/.env`):**
```bash
ANTHROPIC_API_KEY=sk-ant-...
GMAIL_CHECK_INTERVAL=5
BEEPER_ACCESS_TOKEN=bp_...  # Optional
BEEPER_PLATFORMS=imessage,whatsapp,telegram,discord,slack
```

---

## How It Works

1. **Monitor** — Background agents poll Gmail and Beeper every 5 minutes
2. **Categorize** — Claude AI reads each message and assigns category + urgency
3. **Extract** — Specialized agents pull out events, tasks, and key info
4. **Display** — Dashboard shows organized messages in clean sections
5. **Interact** — Add to calendar, complete tasks, or chat with AI assistant

---


## What's Next

- Real-time WebSocket updates (no polling)
- Multi-user support with accounts
- Reply to emails from dashboard
- Mobile app (React Native)
- Voice commands for hands-free interaction
- Analytics dashboard with productivity insights

---

## Contributing

Built for Cal Hacks '25. Contributions welcome!

---


## Contact

**Dean Shahin**
deanshahin@berkeley.edu

others fill here

Built with Next.js, React, TypeScript, and Claude AI

---

⭐ **If you like this project, give it a star on GitHub!**

*Turn message chaos into organized clarity* ✨
