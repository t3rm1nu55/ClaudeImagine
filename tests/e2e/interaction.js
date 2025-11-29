/**
 * Test Two-Way Interaction
 * 
 * REQUIRES: Server running at http://localhost:3000
 *   npm run server:mcp
 */

import { createIsolatedClaudeWithMCP } from '../../scripts/create-isolated-claude.js';
import WebSocket from 'ws';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

const PORT = 3000;
const MCP_URL = `http://localhost:${PORT}/mcp`;
const WS_URL = `ws://localhost:${PORT}`;

let browserWs = null;

function connectBrowser() {
    return new Promise((resolve, reject) => {
        browserWs = new WebSocket(WS_URL);
        browserWs.on('open', resolve);
        browserWs.on('error', reject);
    });
}

function disconnectBrowser() {
    if (browserWs) {
        browserWs.close();
        browserWs = null;
    }
}

describe('E2E Interaction', async () => {

    before(async () => {
        await connectBrowser();
    });

    after(() => {
        disconnectBrowser();
    });

    test('Two-Way Interaction (Browser -> Claude)', async () => {
        // 1. Simulate User Interaction
        const interaction = {
            type: 'USER_INTERACTION',
            eventType: 'click',
            targetId: 'btn-1',
            targetTag: 'BUTTON',
            targetText: 'Click Me',
            timestamp: Date.now()
        };

        browserWs.send(JSON.stringify(interaction));

        // 2. Ask Claude to check for interaction
        const result = await createIsolatedClaudeWithMCP(
            'Call get_next_interaction tool and tell me what the targetText was.',
            { mcpUrl: MCP_URL, model: 'sonnet' }
        );

        assert.ok(result.stdout.includes('Click Me'), 'Claude did not mention "Click Me"');
    });
});
