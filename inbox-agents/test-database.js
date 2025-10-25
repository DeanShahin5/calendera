const Database = require('./database');

async function testDatabase() {
  console.log('Testing database...\n');
  
  const db = new Database('./test-mailmind.db');
  
  try {
    // Initialize
    console.log('1. Initializing database...');
    await db.initialize();
    console.log('✓ Database initialized\n');
    
    // Insert a test message
    console.log('2. Inserting test message...');
    const testMessage = {
      id: 'test123',
      threadId: 'thread123',
      from: 'test@example.com',
      to: 'you@example.com',
      subject: 'Test Email',
      body: 'This is a test email body',
      snippet: 'This is a test...',
      date: new Date().toISOString(),
      timestamp: Date.now(),
      labels: ['INBOX'],
      raw: { test: 'data' }
    };
    
    await db.insertMessage(testMessage);
    console.log('✓ Test message inserted\n');
    
    // Search for the message
    console.log('3. Searching for test message...');
    const results = await db.searchMessages('Test Email');
    console.log(`✓ Found ${results.length} message(s)`);
    console.log('Message:', {
      from: results[0].from_email,
      subject: results[0].subject,
      snippet: results[0].snippet
    });
    console.log('');
    
    // Get unprocessed messages
    console.log('4. Getting unprocessed messages...');
    const unprocessed = await db.getUnprocessedMessages();
    console.log(`✓ Found ${unprocessed.length} unprocessed message(s)\n`);
    
    // Mark as processed
    console.log('5. Marking message as processed...');
    await db.markAsProcessed('test123', 'test', 'low', 0.95);
    console.log('✓ Message marked as processed\n');
    
    // Verify it's processed
    console.log('6. Verifying message was processed...');
    const stillUnprocessed = await db.getUnprocessedMessages();
    console.log(`✓ Now ${stillUnprocessed.length} unprocessed messages\n`);
    
    // Insert test event
    console.log('7. Inserting test event...');
    await db.insertEvent({
      messageId: 'test123',
      title: 'Team Meeting',
      date: '2025-10-26',
      time: '14:00',
      location: 'Conference Room A',
      attendees: ['person1@example.com', 'person2@example.com'],
      isOnCalendar: false
    });
    console.log('✓ Test event inserted\n');
    
    // Insert test todo
    console.log('8. Inserting test todo...');
    await db.insertTodo({
      messageId: 'test123',
      task: 'Complete project report',
      deadline: '2025-10-30',
      priority: 'high'
    });
    console.log('✓ Test todo inserted\n');
    
    // Get events not on calendar
    console.log('9. Getting events not on calendar...');
    const events = await db.getEventsNotOnCalendar();
    console.log(`✓ Found ${events.length} event(s) not on calendar`);
    if (events.length > 0) {
      console.log('Event:', {
        title: events[0].title,
        date: events[0].event_date,
        time: events[0].event_time
      });
    }
    console.log('');
    
    // Get incomplete todos
    console.log('10. Getting incomplete todos...');
    const todos = await db.getIncompleteTodos();
    console.log(`✓ Found ${todos.length} incomplete todo(s)`);
    if (todos.length > 0) {
      console.log('Todo:', {
        task: todos[0].task,
        deadline: todos[0].deadline,
        priority: todos[0].priority
      });
    }
    console.log('');
    
    console.log('✅ All tests passed!');
    console.log('\nDatabase is working correctly. You can now delete test-mailmind.db');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    await db.close();
  }
}

testDatabase();
