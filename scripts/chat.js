/**
 * Interactive Chat with Claude + MCP
 * 
 * Usage: node scripts/chat.js
 */

import { createIsolatedClaudeWithMCP } from './create-isolated-claude.js';

const PORT = 3000;
const MCP_URL = `http://localhost:${PORT}/mcp`;

async function startChat() {
    console.log('\n💬 Starting Interactive Claude Session');
    console.log('─'.repeat(50));
    console.log(`   🔌 Connected to MCP Server at ${MCP_URL}`);
    console.log('   💡 Type your prompt and press Enter.');
    console.log('   🚪 Press Ctrl+C to exit.\n');

    try {
        await createIsolatedClaudeWithMCP('', {
            mcpUrl: MCP_URL,
            model: 'sonnet',
            interactive: true,
            // If you set an API key in server-mcp.js, set it here too via env var or hardcode for testing
            // mcpApiKey: process.env.MCP_API_KEY 
        });
    } catch (error) {
        console.error('\n❌ Session ended:', error.message);
        process.exit(1);
    }
}

startChat();
