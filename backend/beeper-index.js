require('dotenv').config();
const cron = require('node-cron');
const BeeperMonitorAgent = require('./agents/core/beeper-monitor');
const BeeperMessageProcessor = require('./agents/core/beeper-processor');
const BeeperCalendarAgent = require('./beeper-specialists/beeper-calendar-agent');
const BeeperTodoAgent = require('./beeper-specialists/beeper-todo-agent');
const BeeperSocialAgent = require('./beeper-specialists/beeper-social-agent');
const BeeperRecruitmentAgent = require('./beeper-specialists/beeper-recruitment-agent');
const BeeperSpamAgent = require('./beeper-specialists/beeper-spam-agent');
const logger = require('./utils/logger');

let monitorAgent = null;
let processorAgent = null;
let calendarAgent = null;
let todoAgent = null;
let socialAgent = null;
let recruitmentAgent = null;
let spamAgent = null;

async function main() {
  logger.info('Starting AI Beeper Agent System...');
  logger.info('Monitoring platforms: ' + (process.env.BEEPER_PLATFORMS || 'all'));
  
  // Initialize Beeper Monitor Agent
  monitorAgent = new BeeperMonitorAgent();

  // Initialize Beeper Message Processor
  processorAgent = new BeeperMessageProcessor();

  // Initialize Specialized Agents
  calendarAgent = new BeeperCalendarAgent();
  todoAgent = new BeeperTodoAgent();
  socialAgent = new BeeperSocialAgent();
  recruitmentAgent = new BeeperRecruitmentAgent();
  spamAgent = new BeeperSpamAgent();

  try {
    await monitorAgent.initialize();
    await processorAgent.initialize();
    await calendarAgent.initialize();
    await todoAgent.initialize();
    await socialAgent.initialize();
    await recruitmentAgent.initialize();
    await spamAgent.initialize();
    logger.info('All Beeper agents initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Beeper agents', { error: error.message });
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

    // Run specialized agents
    await runSpecializedAgents();
  }

  // Schedule periodic checks (every 5 minutes by default)
  const interval = process.env.BEEPER_CHECK_INTERVAL || 5;
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

        // Run specialized agents
        await runSpecializedAgents();
      }
    } catch (error) {
      logger.error('Error in scheduled check', { error: error.message });
    }
  });

  // Schedule specialized agent processing (every 15 minutes)
  cron.schedule('*/15 * * * *', async () => {
    logger.info('Running specialized agent processing...');
    await runSpecializedAgents();
  });

  logger.info('AI Beeper Agent is now monitoring your messages...');
  logger.info('Press Ctrl+C to stop');
}

/**
 * Run all specialized agents to process categorized messages
 */
async function runSpecializedAgents() {
  try {
    logger.info('Running specialized agents...');

    // Calendar Agent - Extract events from EVENT messages
    try {
      const calendarResult = await calendarAgent.processEventMessages();
      logger.info('Calendar agent complete', calendarResult);
    } catch (error) {
      logger.error('Calendar agent error', { error: error.message });
    }

    // TODO Agent - Extract tasks from TODO messages
    try {
      const todoResult = await todoAgent.processTodoMessages();
      logger.info('TODO agent complete', todoResult);
    } catch (error) {
      logger.error('TODO agent error', { error: error.message });
    }

    // Social Agent - Analyze SOCIAL messages
    try {
      const socialResult = await socialAgent.processSocialMessages();
      logger.info('Social agent complete', socialResult);
    } catch (error) {
      logger.error('Social agent error', { error: error.message });
    }

    // Recruitment Agent - Analyze RECRUITMENT messages
    try {
      const recruitmentResult = await recruitmentAgent.processRecruitmentMessages();
      logger.info('Recruitment agent complete', recruitmentResult);
    } catch (error) {
      logger.error('Recruitment agent error', { error: error.message });
    }

    // Spam Agent - Analyze SPAM messages
    try {
      const spamResult = await spamAgent.processSpamMessages();
      logger.info('Spam agent complete', spamResult);
    } catch (error) {
      logger.error('Spam agent error', { error: error.message });
    }

    logger.info('All specialized agents completed');
  } catch (error) {
    logger.error('Error running specialized agents', { error: error.message });
  }
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

  // Cleanup specialized agents
  const specializedAgents = [calendarAgent, todoAgent, socialAgent, recruitmentAgent, spamAgent];
  for (const agent of specializedAgents) {
    if (agent) {
      try {
        await agent.cleanup();
      } catch (error) {
        logger.error('Error during specialized agent cleanup', { error: error.message });
      }
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
