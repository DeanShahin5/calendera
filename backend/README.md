# Backend

Node.js monitoring agents for Gmail and Beeper message processing.

## Setup

```bash
npm install
```

## Environment Variables

Create `.env`:

```bash
ANTHROPIC_API_KEY=your_api_key_here
GMAIL_CHECK_INTERVAL=5

# Optional: Beeper integration
BEEPER_ACCESS_TOKEN=your_beeper_token
BEEPER_PLATFORMS=imessage,whatsapp,telegram,discord,slack
BEEPER_CHECK_INTERVAL=5
```

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project, enable Gmail API + Google Calendar API
3. Create OAuth 2.0 credentials (Desktop app)
4. Download as `credentials.json` and place in this directory

## First Run

Authorize Google access:

```bash
node index.js
```

Follow the link to authorize. Token saved to `token.json`.

## Running

### Gmail Monitor
```bash
npm run start
# or for development with auto-restart:
npm run dev
```

### Beeper Monitor (optional)
```bash
npm run beeper
# or for development:
npm run beeper:dev
```

## Database

SQLite databases stored in `data/`:
- `mailmind.db` - Gmail messages
- `beeper-messages.db` - Beeper messages
