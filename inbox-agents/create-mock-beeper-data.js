/**
 * Create mock Beeper data for testing the UI
 * Run this script to populate beeper-messages.db with sample messages
 */

const BeeperDatabase = require('./beeper-database');

async function createMockData() {
  console.log('Creating mock Beeper data...\n');

  const db = new BeeperDatabase();
  await db.initialize();

  // Mock messages from different platforms and categories
  const mockMessages = [
    // iMessage - Social
    {
      id: 'msg-imessage-1',
      platform: 'imessage',
      roomId: 'room-1',
      roomName: 'John Doe',
      from_contact: '+1234567890',
      from_name: 'John Doe',
      body: 'Hey! How have you been? Haven\'t talked in a while. We should catch up soon!',
      timestamp: Date.now() - 3600000, // 1 hour ago
      date: new Date(Date.now() - 3600000).toISOString(),
      is_group_message: false,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    },

    // WhatsApp - Event
    {
      id: 'msg-whatsapp-1',
      platform: 'whatsapp',
      roomId: 'room-2',
      roomName: 'Sarah Chen',
      from_contact: '+1987654321',
      from_name: 'Sarah Chen',
      body: 'Want to grab coffee tomorrow at 2pm? There\'s a new cafe downtown I want to check out.',
      timestamp: Date.now() - 7200000, // 2 hours ago
      date: new Date(Date.now() - 7200000).toISOString(),
      is_group_message: false,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    },

    // Telegram - TODO
    {
      id: 'msg-telegram-1',
      platform: 'telegram',
      roomId: 'room-3',
      roomName: 'Mike Johnson',
      from_contact: '@mikej',
      from_name: 'Mike Johnson',
      body: 'Don\'t forget to send me the presentation slides by Friday! It\'s urgent for the client meeting.',
      timestamp: Date.now() - 10800000, // 3 hours ago
      date: new Date(Date.now() - 10800000).toISOString(),
      is_group_message: false,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    },

    // Signal - Recruitment
    {
      id: 'msg-signal-1',
      platform: 'signal',
      roomId: 'room-4',
      roomName: 'TechCorp Recruiter',
      from_contact: '+1555123456',
      from_name: 'Jessica Lee',
      body: 'Hi! We have an exciting Senior Engineer position at TechCorp. $140k-180k, fully remote. Would love to chat if you\'re interested!',
      timestamp: Date.now() - 14400000, // 4 hours ago
      date: new Date(Date.now() - 14400000).toISOString(),
      is_group_message: false,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    },

    // Slack - TODO
    {
      id: 'msg-slack-1',
      platform: 'slack',
      roomId: 'room-5',
      roomName: '#engineering',
      from_contact: '@boss',
      from_name: 'Boss Man',
      body: 'Team: Please review the PR #234 before EOD. We need to deploy tomorrow morning.',
      timestamp: Date.now() - 18000000, // 5 hours ago
      date: new Date(Date.now() - 18000000).toISOString(),
      is_group_message: true,
      has_attachments: false,
      attachments: [],
      participants: ['@boss', '@you', '@teammate1', '@teammate2'],
      raw: {}
    },

    // iMessage - SPAM
    {
      id: 'msg-imessage-spam-1',
      platform: 'imessage',
      roomId: 'room-6',
      roomName: 'Unknown',
      from_contact: '+1999888777',
      from_name: 'Unknown',
      body: 'CONGRATULATIONS! You\'ve won $1,000,000! Click here NOW to claim your prize!!! LIMITED TIME OFFER!!!',
      timestamp: Date.now() - 21600000, // 6 hours ago
      date: new Date(Date.now() - 21600000).toISOString(),
      is_group_message: false,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    },

    // WhatsApp - Social (group)
    {
      id: 'msg-whatsapp-2',
      platform: 'whatsapp',
      roomId: 'room-7',
      roomName: 'College Friends',
      from_contact: '+1444555666',
      from_name: 'Alex Rivera',
      body: 'Who\'s down for a reunion this summer? Maybe a camping trip?',
      timestamp: Date.now() - 25200000, // 7 hours ago
      date: new Date(Date.now() - 25200000).toISOString(),
      is_group_message: true,
      has_attachments: false,
      attachments: [],
      participants: ['Alex Rivera', 'You', 'Jamie', 'Sam', 'Casey'],
      raw: {}
    },

    // Discord - Informational
    {
      id: 'msg-discord-1',
      platform: 'discord',
      roomId: 'room-8',
      roomName: '#general',
      from_contact: '@techguru',
      from_name: 'TechGuru',
      body: 'Just announced: Next.js 16 is out with massive performance improvements! Check it out: https://nextjs.org/blog/next-16',
      timestamp: Date.now() - 28800000, // 8 hours ago
      date: new Date(Date.now() - 28800000).toISOString(),
      is_group_message: true,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    },

    // iMessage - Event
    {
      id: 'msg-imessage-2',
      platform: 'imessage',
      roomId: 'room-9',
      roomName: 'Mom',
      from_contact: '+1222333444',
      from_name: 'Mom',
      body: 'Don\'t forget - family dinner this Sunday at 6pm! Your dad is grilling steaks.',
      timestamp: Date.now() - 32400000, // 9 hours ago
      date: new Date(Date.now() - 32400000).toISOString(),
      is_group_message: false,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    },

    // Telegram - Financial
    {
      id: 'msg-telegram-2',
      platform: 'telegram',
      roomId: 'room-10',
      roomName: 'Venmo Bot',
      from_contact: '@venmo',
      from_name: 'Venmo',
      body: 'You received $25.00 from Sarah Chen for "Coffee ☕"',
      timestamp: Date.now() - 36000000, // 10 hours ago
      date: new Date(Date.now() - 36000000).toISOString(),
      is_group_message: false,
      has_attachments: false,
      attachments: [],
      participants: [],
      raw: {}
    }
  ];

  console.log(`Inserting ${mockMessages.length} mock messages...\n`);

  // Insert mock messages
  let successCount = 0;
  for (const message of mockMessages) {
    try {
      await db.insertMessage(message);
      console.log(`✓ Added ${message.platform} message from ${message.from_name}`);
      successCount++;
    } catch (error) {
      console.error(`✗ Failed to add message: ${error.message}`);
    }
  }

  console.log(`\nSuccessfully inserted ${successCount}/${mockMessages.length} messages\n`);

  // Now add categorization for some messages
  console.log('Adding AI categorization...\n');

  const categorizations = [
    { message_id: 'msg-imessage-1', category: 'SOCIAL', urgency: 'low', confidence: 0.95 },
    { message_id: 'msg-whatsapp-1', category: 'EVENT', urgency: 'medium', confidence: 0.92 },
    { message_id: 'msg-telegram-1', category: 'TODO', urgency: 'high', confidence: 0.98 },
    { message_id: 'msg-signal-1', category: 'RECRUITMENT', urgency: 'medium', confidence: 0.89 },
    { message_id: 'msg-slack-1', category: 'TODO', urgency: 'high', confidence: 0.96 },
    { message_id: 'msg-imessage-spam-1', category: 'SPAM', urgency: 'low', confidence: 0.99 },
    { message_id: 'msg-whatsapp-2', category: 'SOCIAL', urgency: 'low', confidence: 0.91 },
    { message_id: 'msg-discord-1', category: 'INFORMATIONAL', urgency: 'low', confidence: 0.87 },
    { message_id: 'msg-imessage-2', category: 'EVENT', urgency: 'medium', confidence: 0.94 },
    { message_id: 'msg-telegram-2', category: 'FINANCIAL', urgency: 'low', confidence: 0.97 }
  ];

  for (const cat of categorizations) {
    try {
      await db.markAsProcessed(cat.message_id, cat.category, cat.urgency, cat.confidence);
      console.log(`✓ Categorized ${cat.message_id} as ${cat.category}`);
    } catch (error) {
      console.error(`✗ Failed to categorize: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('Mock data creation complete!');
  console.log('='.repeat(50));
  console.log('\nYou can now:');
  console.log('1. Visit the dashboard to see Beeper messages');
  console.log('2. Use the chatbot to query messages');
  console.log('3. Filter by platform or category');
  console.log('\nExample chatbot queries:');
  console.log('  - "Show me iMessages"');
  console.log('  - "Any urgent messages?"');
  console.log('  - "Show me spam"');
  console.log('  - "What events are coming up?"');
  console.log('');

  await db.close();
}

// Run the script
createMockData().catch(error => {
  console.error('Error creating mock data:', error);
  process.exit(1);
});
