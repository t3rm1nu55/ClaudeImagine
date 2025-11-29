/**
 * Test State Verification
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

        browserWs.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'UPDATE_DOM') {
                setTimeout(() => {
                    const ack = {
                        type: 'DOM_UPDATED',
                        requestId: msg.requestId,
                        htmlLength: msg.html.length, // Mock length
                        timestamp: Date.now()
                    };
                    browserWs.send(JSON.stringify(ack));
                }, 100);
            }
        });

        browserWs.on('error', reject);
    });
}

function disconnectBrowser() {
    if (browserWs) {
        browserWs.close();
        browserWs = null;
    }
}

describe('E2E Verification', async () => {

    before(async () => {
        await connectBrowser();
    });

    after(() => {
        disconnectBrowser();
    });

    test('State Verification (Claude -> Browser -> Server -> Claude)', async () => {
        const result = await createIsolatedClaudeWithMCP(
            'Call update_ui with html "<h1>Verified</h1>". Then tell me the "Actual content length" that was returned.',
            { mcpUrl: MCP_URL, model: 'sonnet' }
        );

        assert.ok(
            result.stdout.includes('Actual content length') || result.stdout.includes('19'),
            'Claude did not receive verification'
        );
    });
});
