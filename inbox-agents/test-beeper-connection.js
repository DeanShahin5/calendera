require('dotenv').config();
const BeeperMCPClient = require('./beeper-mcp-client');

async function testConnection() {
  const client = new BeeperMCPClient();

  try {
    console.log('1. Connecting to Beeper MCP...');
    await client.connect();
    console.log('✅ Connected successfully!');

    console.log('\n2. Testing get_accounts tool...');
    try {
      const accountsResult = await client.client.callTool({
        name: 'get_accounts',
        arguments: {}
      });
      console.log('✅ get_accounts response:', JSON.stringify(accountsResult, null, 2));
    } catch (error) {
      console.log('❌ get_accounts error:', error.message);
    }

    console.log('\n3. Testing search_messages with query...');
    try {
      const messagesResult = await client.client.callTool({
        name: 'search_messages',
        arguments: {
          query: 'hello',
          limit: 5
        }
      });
      console.log('✅ search_messages response:', JSON.stringify(messagesResult, null, 2));
    } catch (error) {
      console.log('❌ search_messages error:', error.message);
    }

    await client.disconnect();
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Full error:', error);
  }
}

testConnection();
