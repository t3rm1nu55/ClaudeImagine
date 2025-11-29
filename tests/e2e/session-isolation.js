/**
 * Test Session Isolation
 * 
 * REQUIRES: Server running at http://localhost:3000
 *   npm run server:mcp
 */

import { createIsolatedClaudeWithMCP } from '../../scripts/create-isolated-claude.js';
import WebSocket from 'ws';
import { randomUUID } from 'crypto';
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';

const PORT = 3000;
const MCP_URL = `http://localhost:${PORT}/mcp`;
const WS_URL = `ws://localhost:${PORT}`;

function connectBrowser(sessionId) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}`);
        const messages = [];

        ws.on('open', () => resolve({ ws, messages }));
        ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            messages.push(msg);
        });
        ws.on('error', reject);
    });
}

describe('E2E Session Isolation', async () => {
    const sessionA = randomUUID();
    const sessionB = randomUUID();
    let browserA, browserB;

    before(async () => {
        browserA = await connectBrowser(sessionA);
        browserB = await connectBrowser(sessionB);
    });

    after(() => {
        if (browserA) browserA.ws.close();
        if (browserB) browserB.ws.close();
    });

    test('Targeted Message (Session A)', async () => {
        await createIsolatedClaudeWithMCP(
            `Call log_thought with message "Hello A" and sessionId "${sessionA}".`,
            { mcpUrl: MCP_URL, model: 'sonnet' }
        );

        // Wait for messages
        await new Promise(r => setTimeout(r, 1000));

        const msgA = browserA.messages.find(m => m.message === 'Hello A');
        const msgB = browserB.messages.find(m => m.message === 'Hello A');

        assert.ok(msgA, 'Session A should receive message');
        assert.ok(!msgB, 'Session B should NOT receive message');
    });

    test('Broadcast Message (All Sessions)', async () => {
        await createIsolatedClaudeWithMCP(
            `Call log_thought with message "Hello Everyone" (do not provide sessionId).`,
            { mcpUrl: MCP_URL, model: 'sonnet' }
        );

        await new Promise(r => setTimeout(r, 1000));

        const broadcastA = browserA.messages.find(m => m.message === 'Hello Everyone');
        const broadcastB = browserB.messages.find(m => m.message === 'Hello Everyone');

        assert.ok(broadcastA, 'Session A should receive broadcast');
        assert.ok(broadcastB, 'Session B should receive broadcast');
    });

});
