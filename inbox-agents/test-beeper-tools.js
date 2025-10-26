require('dotenv').config();
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');

async function testTools() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@beeper/desktop-mcp'],
    env: {
      ...process.env,
      BEEPER_ACCESS_TOKEN: process.env.BEEPER_ACCESS_TOKEN
    }
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  }, {
    capabilities: {
      tools: {},
    },
  });

  try {
    console.log('1. Connecting...');
    await client.connect(transport);
    console.log('✅ Connected!\n');

    // Test 1: List available tools
    console.log('2. Listing available tools...');
    const tools = await client.listTools();
    console.log('Available tools:', tools.tools.map(t => `${t.name}`).join(', '));
    console.log('\nTool details:');
    tools.tools.forEach(tool => {
      console.log(`\n  ${tool.name}:`);
      console.log(`    Description: ${tool.description}`);
      if (tool.inputSchema?.properties) {
        console.log(`    Parameters:`, Object.keys(tool.inputSchema.properties));
      }
    });

    // Test 2: Try search_chats with different parameters
    console.log('\n\n3. Testing search_chats...');
    try {
      const result1 = await client.callTool({ name: 'search_chats', arguments: {} });
      console.log('✅ search_chats (no args):', JSON.stringify(result1, null, 2));
    } catch (e) {
      console.log('❌ search_chats (no args):', e.message);
    }

    try {
      const result2 = await client.callTool({ name: 'search_chats', arguments: { query: '' } });
      console.log('✅ search_chats (empty query):', JSON.stringify(result2, null, 2));
    } catch (e) {
      console.log('❌ search_chats (empty query):', e.message);
    }

    try {
      const result3 = await client.callTool({ name: 'search_chats', arguments: { query: 'test' } });
      console.log('✅ search_chats (query=test):', JSON.stringify(result3, null, 2));
    } catch (e) {
      console.log('❌ search_chats (query=test):', e.message);
    }

    // Test 3: Try get_accounts
    console.log('\n\n4. Testing get_accounts...');
    try {
      const result = await client.callTool({ name: 'get_accounts', arguments: {} });
      console.log('✅ get_accounts:', JSON.stringify(result, null, 2));
    } catch (e) {
      console.log('❌ get_accounts:', e.message);
    }

    await client.close();
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTools();
