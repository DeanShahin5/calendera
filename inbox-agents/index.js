require('dotenv').config();
const cron = require('node-cron');
const InboxMonitorAgent = require('./agents/core/inbox-monitor');
const logger = require('./utils/logger');

async function main() {
  logger.info('Starting AI Gmail Agent System...');
  
  // Initialize Inbox Monitor Agent
  const monitorAgent = new InboxMonitorAgent();
  
  try {
    await monitorAgent.initialize();
    logger.info('All agents initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize agents', { error: error.message });
    process.exit(1);
  }

  // Run immediately on startup
  logger.info('Running initial check...');
  const result = await monitorAgent.monitor();
  logger.info('Initial check complete', result);

  // Schedule periodic checks (every 5 minutes by default)
  const interval = process.env.GMAIL_CHECK_INTERVAL || 5;
  const cronExpression = `*/${interval} * * * *`;
  
  logger.info(`Scheduling checks every ${interval} minutes`);
  
  cron.schedule(cronExpression, async () => {
    logger.info('Running scheduled check...');
    try {
      const result = await monitorAgent.monitor();
      logger.info('Scheduled check complete', { 
        newMessages: result.count 
      });
      
      if (result.count > 0) {
        logger.info('New messages detected!', {
          count: result.count,
          savedTo: result.savedTo
        });
        
        // TODO: Trigger Message Processing Agent here
        // await messageProcessor.process(result.messages);
      }
    } catch (error) {
      logger.error('Error in scheduled check', { error: error.message });
    }
  });

  logger.info('AI Gmail Agent is now monitoring your inbox...');
  logger.info('Press Ctrl+C to stop');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Start the application
main().catch(error => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});