require('dotenv').config();
const cron = require('node-cron');
const InboxMonitorAgent = require('./agents/core/inbox-monitor');
const MessageProcessorAgent = require('./agents/core/message-processor');
const logger = require('./utils/logger');

let monitorAgent = null;
let processorAgent = null;

async function main() {
  logger.info('Starting AI Gmail Agent System...');
  
  // Initialize Inbox Monitor Agent
  monitorAgent = new InboxMonitorAgent();

  // Initialize Message Processor Agent
  processorAgent = new MessageProcessorAgent();

  try {
    await monitorAgent.initialize();
    await processorAgent.initialize();
    logger.info('All agents initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize agents', { error: error.message });
    process.exit(1);
  }

  // Run immediately on startup
  logger.info('Running initial check...');
  const result = await monitorAgent.monitor();
  logger.info('Initial check complete', result);

  // Process any new messages
  if (result.count > 0) {
    logger.info('Processing new messages...');
    const processResult = await processorAgent.processMessages();
    logger.info('Message processing complete', processResult);
  }

  // Schedule periodic checks (every 5 minutes by default)
  const interval = process.env.GMAIL_CHECK_INTERVAL || 5;
  const cronExpression = `*/${interval} * * * *`;
  
  logger.info(`Scheduling checks every ${interval} minutes`);
  
  cron.schedule(cronExpression, async () => {
    logger.info('Running scheduled check...');
    try {
      const result = await monitorAgent.monitor();
      logger.info('Scheduled check complete', { 
        newMessages: result.count,
        saved: result.saved
      });
      
      if (result.count > 0) {
        logger.info('New messages detected!', {
          count: result.count,
          saved: result.saved
        });

        // Process new messages
        logger.info('Processing new messages...');
        const processResult = await processorAgent.processMessages();
        logger.info('Message processing complete', processResult);
      }
    } catch (error) {
      logger.error('Error in scheduled check', { error: error.message });
    }
  });

  logger.info('AI Gmail Agent is now monitoring your inbox...');
  logger.info('Press Ctrl+C to stop');
}

// Handle graceful shutdown
async function shutdown() {
  logger.info('Shutting down gracefully...');

  if (monitorAgent) {
    try {
      await monitorAgent.cleanup();
    } catch (error) {
      logger.error('Error during monitor cleanup', { error: error.message });
    }
  }

  if (processorAgent) {
    try {
      await processorAgent.cleanup();
    } catch (error) {
      logger.error('Error during processor cleanup', { error: error.message });
    }
  }

  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Start the application
main().catch(error => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});
