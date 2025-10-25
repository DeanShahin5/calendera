# AI Agents for Gmail Categorization

This directory contains the AI agent system for categorizing and routing Gmail messages.

## Categorization and Routing Agent

The **Categorization Agent** is responsible for analyzing incoming Gmail messages and routing them to the appropriate specialist agent.

### Overview

The agent reads structured Gmail message data (ID, sender, subject, body) and:
1. Analyzes the message semantically using pattern matching
2. Categorizes it into one of five domains
3. Outputs a routing instruction to the correct specialist agent

### Categories & Specialist Agents

| Category | Agent | Handles |
|----------|-------|---------|
| `events` | `EVENTS_AGENT` | Scheduling, meetings, appointments, invitations |
| `to_do` | `TODO_AGENT` | Requests, reminders, action items |
| `social` | `SOCIAL_AGENT` | Personal, friendly, conversational messages |
| `promotion` | `PROMOTION_AGENT` | Advertisements, marketing, newsletters |
| `recruiting` | `RECRUITMENT_AGENT` | Job applications, interviews, offers |

### Usage

```typescript
import { categorizeAndRoute, type GmailMessage } from '@/lib/agents/categorization-agent';

// Example message
const message: GmailMessage = {
  id: 'msg_12345',
  sender: 'hr@company.com',
  subject: 'Interview Invitation',
  body: 'We would like to invite you for an interview on Friday at 3 PM.'
};

// Get routing decision
const decision = categorizeAndRoute(message);

console.log(decision);
// Output:
// {
//   "id": "msg_12345",
//   "category": "recruiting",
//   "route_to": "RECRUITMENT_AGENT",
//   "confidence": 0.95,
//   "rationale": "Job-related communication such as interview, application, or offer."
// }
```

### API

#### `categorizeAndRoute(message: GmailMessage): RoutingDecision`

Analyzes a single message and returns a routing decision.

**Parameters:**
- `message`: Gmail message object with `id`, `sender`, `subject`, and `body`

**Returns:** Routing decision with category, target agent, confidence score, and rationale

#### `categorizeAndRouteMultiple(messages: GmailMessage[]): RoutingDecision[]`

Process multiple messages at once.

**Parameters:**
- `messages`: Array of Gmail message objects

**Returns:** Array of routing decisions

#### `categorizeAndRouteJSON(message: GmailMessage): string`

Returns the routing decision as a formatted JSON string.

### Pattern Matching

The agent uses regex pattern matching to identify message categories. Patterns are tuned for high accuracy across common email types.

### Confidence Scoring

Confidence scores (0.0-1.0) are calculated based on:
- Number of matching patterns
- Strength of semantic indicators
- Minimum threshold of 0.4 to ensure reasonable decisions

### Testing

Run the test suite to validate categorization accuracy:

```bash
npx ts-node lib/agents/categorization-agent.test.ts
```

### Integration with Dashboard

To integrate with the dashboard, the agent can be called from API routes or server actions to categorize messages before displaying them.

Example:
```typescript
// In your API route or server action
const messages = await fetchGmailMessages();
const categorizedMessages = categorizeAndRouteMultiple(messages);

// Group by category for display
const grouped = categorizedMessages.reduce((acc, decision) => {
  if (!acc[decision.category]) acc[decision.category] = [];
  acc[decision.category].push(decision);
  return acc;
}, {});
```

## Future Enhancements

- Integration with actual Gmail API
- Machine learning model for improved accuracy
- User feedback loop for continuous improvement
- Custom category rules per user
- Multi-language support
