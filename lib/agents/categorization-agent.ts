/**
 * CATEGORIZATION AND ROUTING AGENT
 *
 * Analyzes Gmail message data and routes to specialized agents
 */

export type MessageCategory = 'events' | 'to_do' | 'social' | 'promotion' | 'recruiting';

export type SpecialistAgent =
  | 'EVENTS_AGENT'
  | 'TODO_AGENT'
  | 'SOCIAL_AGENT'
  | 'PROMOTION_AGENT'
  | 'RECRUITMENT_AGENT';

export interface GmailMessage {
  id: string;
  sender: string;
  subject: string;
  body: string;
}

export interface RoutingDecision {
  id: string;
  category: MessageCategory;
  route_to: SpecialistAgent;
  confidence: number;
  rationale: string;
}

/**
 * Pattern matching for each category
 */
const CATEGORY_PATTERNS = {
  events: [
    /meeting/i,
    /appointment/i,
    /scheduled/i,
    /calendar/i,
    /invite/i,
    /rsvp/i,
    /join us/i,
    /at \d{1,2}:\d{2}/i,
    /on (monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i,
    /confirmed for/i,
    /zoom/i,
    /teams meeting/i,
    /google meet/i,
  ],
  to_do: [
    /please complete/i,
    /reminder/i,
    /follow up/i,
    /action required/i,
    /need to/i,
    /submit/i,
    /deadline/i,
    /due by/i,
    /task/i,
    /checklist/i,
    /please review/i,
    /approval needed/i,
  ],
  social: [
    /how have you been/i,
    /catch up/i,
    /long time no see/i,
    /hope you're doing well/i,
    /thank you/i,
    /thanks/i,
    /congratulations/i,
    /happy birthday/i,
    /wanted to say/i,
    /lunch/i,
    /coffee/i,
    /personal/i,
  ],
  promotion: [
    /discount/i,
    /sale/i,
    /offer/i,
    /subscribe/i,
    /newsletter/i,
    /deal/i,
    /coupon/i,
    /limited time/i,
    /promotion/i,
    /advertisement/i,
    /unsubscribe/i,
    /% off/i,
    /buy now/i,
    /shop now/i,
  ],
  recruiting: [
    /job opportunity/i,
    /resume/i,
    /interview/i,
    /recruiter/i,
    /position/i,
    /application/i,
    /candidate/i,
    /hiring/i,
    /career/i,
    /cv/i,
    /offer letter/i,
    /job opening/i,
    /recruitment/i,
  ],
};

/**
 * Calculate confidence score based on pattern matches
 */
function calculateConfidence(text: string, patterns: RegExp[]): number {
  const matches = patterns.filter(pattern => pattern.test(text));
  const matchRatio = matches.length / patterns.length;

  // Base confidence + boost for multiple matches
  const baseConfidence = 0.5;
  const boost = matchRatio * 0.5;

  return Math.min(baseConfidence + boost, 1.0);
}

/**
 * Analyze message and determine category
 */
function analyzeMessage(message: GmailMessage): { category: MessageCategory; confidence: number } {
  const fullText = `${message.subject} ${message.body}`.toLowerCase();

  const scores: Record<MessageCategory, number> = {
    events: calculateConfidence(fullText, CATEGORY_PATTERNS.events),
    to_do: calculateConfidence(fullText, CATEGORY_PATTERNS.to_do),
    social: calculateConfidence(fullText, CATEGORY_PATTERNS.social),
    promotion: calculateConfidence(fullText, CATEGORY_PATTERNS.promotion),
    recruiting: calculateConfidence(fullText, CATEGORY_PATTERNS.recruiting),
  };

  // Find category with highest confidence
  let bestCategory: MessageCategory = 'social'; // default
  let bestConfidence = 0;

  for (const [category, confidence] of Object.entries(scores)) {
    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestCategory = category as MessageCategory;
    }
  }

  // Ensure minimum confidence threshold
  if (bestConfidence < 0.4) {
    bestConfidence = 0.4;
  }

  return { category: bestCategory, confidence: bestConfidence };
}

/**
 * Map category to specialist agent
 */
function getSpecialistAgent(category: MessageCategory): SpecialistAgent {
  const mapping: Record<MessageCategory, SpecialistAgent> = {
    events: 'EVENTS_AGENT',
    to_do: 'TODO_AGENT',
    social: 'SOCIAL_AGENT',
    promotion: 'PROMOTION_AGENT',
    recruiting: 'RECRUITMENT_AGENT',
  };

  return mapping[category];
}

/**
 * Generate rationale for routing decision
 */
function generateRationale(category: MessageCategory, message: GmailMessage): string {
  const rationales: Record<MessageCategory, string> = {
    events: 'Message contains scheduling, meeting, or calendar-related content.',
    to_do: 'Message assigns a clear task, reminder, or action item.',
    social: 'Casual personal message or friendly communication.',
    promotion: 'Marketing, advertisement, or promotional content detected.',
    recruiting: 'Job-related communication such as interview, application, or offer.',
  };

  return rationales[category];
}

/**
 * Main categorization and routing function
 */
export function categorizeAndRoute(message: GmailMessage): RoutingDecision {
  // Analyze message
  const { category, confidence } = analyzeMessage(message);

  // Determine specialist agent
  const route_to = getSpecialistAgent(category);

  // Generate rationale
  const rationale = generateRationale(category, message);

  // Return routing decision
  return {
    id: message.id,
    category,
    route_to,
    confidence: Math.round(confidence * 100) / 100, // Round to 2 decimals
    rationale,
  };
}

/**
 * Process multiple messages
 */
export function categorizeAndRouteMultiple(messages: GmailMessage[]): RoutingDecision[] {
  return messages.map(categorizeAndRoute);
}

/**
 * Get routing decision as JSON string
 */
export function categorizeAndRouteJSON(message: GmailMessage): string {
  const decision = categorizeAndRoute(message);
  return JSON.stringify(decision, null, 2);
}
