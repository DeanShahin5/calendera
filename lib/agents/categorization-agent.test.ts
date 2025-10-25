/**
 * Test suite for Categorization and Routing Agent
 */

import { categorizeAndRoute, type GmailMessage } from './categorization-agent';

// Test examples from specification
const testMessages: GmailMessage[] = [
  {
    id: 'e101',
    sender: 'friend@example.com',
    subject: 'Lunch catch up',
    body: 'Hey, long time no see! Want to grab lunch next week?',
  },
  {
    id: 'e102',
    sender: 'hr@company.com',
    subject: 'Interview Scheduled',
    body: 'Your interview for the Marketing Manager role is scheduled for Thursday at 2 PM.',
  },
  {
    id: 'e103',
    sender: 'finance@company.com',
    subject: 'Expense Report Reminder',
    body: 'Reminder: please submit your expense report by Friday.',
  },
  {
    id: 'e104',
    sender: 'events@expo.com',
    subject: '2025 AI Expo - Register Now!',
    body: 'Join us for the 2025 AI Expo – register now to attend!',
  },
  {
    id: 'e105',
    sender: 'admin@company.com',
    subject: 'Budget Meeting Confirmed',
    body: 'Budget meeting is confirmed for Monday 10 AM.',
  },
];

// Expected results
const expectedResults = [
  { id: 'e101', category: 'social', route_to: 'SOCIAL_AGENT' },
  { id: 'e102', category: 'recruiting', route_to: 'RECRUITMENT_AGENT' },
  { id: 'e103', category: 'to_do', route_to: 'TODO_AGENT' },
  { id: 'e104', category: 'promotion', route_to: 'PROMOTION_AGENT' },
  { id: 'e105', category: 'events', route_to: 'EVENTS_AGENT' },
];

// Run tests
console.log('🧪 CATEGORIZATION AGENT TEST SUITE\n');
console.log('='.repeat(60));

testMessages.forEach((message, index) => {
  const result = categorizeAndRoute(message);
  const expected = expectedResults[index];

  const passed =
    result.category === expected.category && result.route_to === expected.route_to;

  console.log(`\nTest ${index + 1}: ${message.id}`);
  console.log(`Subject: "${message.subject}"`);
  console.log(`Body: "${message.body}"`);
  console.log('─'.repeat(60));
  console.log(`✓ Category: ${result.category} (expected: ${expected.category})`);
  console.log(`✓ Route to: ${result.route_to} (expected: ${expected.route_to})`);
  console.log(`✓ Confidence: ${result.confidence}`);
  console.log(`✓ Rationale: ${result.rationale}`);
  console.log(`\nResult: ${passed ? '✅ PASS' : '❌ FAIL'}`);
  console.log('='.repeat(60));
});

console.log('\n🎉 Test suite complete!\n');

// Example JSON output
console.log('Example JSON Output:');
console.log('─'.repeat(60));
const exampleDecision = categorizeAndRoute(testMessages[0]);
console.log(JSON.stringify(exampleDecision, null, 2));
