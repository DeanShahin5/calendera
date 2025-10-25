require('dotenv').config();
const InboxMonitorAgent = require('./agents/core/inbox-monitor');
const logger = require('./utils/logger');

async function testMonitor() {
  logger.info('Testing Inbox Monitor Agent...');
  
  const agent = new InboxMonitorAgent();
  
  try {
    // Initialize
    await agent.initialize();
    logger.info('✓ Agent initialized successfully');
    
    // Test checking for messages
    logger.info('Checking for messages...');
    const result = await agent.monitor();
    
    logger.info('Test Results:', {
      messagesFound: result.count,
      savedTo: result.savedTo
    });
    
    if (result.count > 0) {
      logger.info('Sample message:', {
        from: result.messages[0].from,
        subject: result.messages[0].subject,
        date: result.messages[0].date
      });
    }
    
    logger.info('✓ Test completed successfully!');
  } catch (error) {
    logger.error('✗ Test failed', { error: error.message, stack: error.stack });
    process.exit(1);
  }
}

testMonitor();