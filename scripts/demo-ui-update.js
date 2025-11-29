
import { createIsolatedClaudeWithMCP } from './create-isolated-claude.js';

const PORT = 3000;
const MCP_URL = `http://localhost:${PORT}/mcp`;

async function runDemo() {
    console.log('Starting demo update script...');

    // Retry loop to wait for browser
    for (let i = 0; i < 30; i++) {
        try {
            console.log(`Attempt ${i + 1}: Sending update...`);
            const result = await createIsolatedClaudeWithMCP(
                'Call update_ui with html "<div style=\'padding: 20px; background: #f0f9ff; border: 2px solid #0ea5e9; border-radius: 8px;\'><h1>Hello from Claude!</h1><p>I can control the browser.</p><button id=\'demo-btn\'>Click Me</button></div>".',
                { mcpUrl: MCP_URL, model: 'sonnet' }
            );

            if (result.stdout.includes('UI updated successfully')) {
                console.log('SUCCESS: UI updated!');
                break;
            } else {
                console.log('Result:', result.stdout);
                console.log('Waiting for browser...');
            }
        } catch (e) {
            console.log('Error:', e.message);
        }
        await new Promise(r => setTimeout(r, 1000));
    }
}

runDemo();
