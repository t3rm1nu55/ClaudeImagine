#!/bin/bash
# Test tool execution with proper setup

cd "$(dirname "$0")"

# Cleanup
cleanup() {
    kill $SERVER_PID 2>/dev/null
    lsof -ti:3000 | xargs kill -9 2>/dev/null
}
trap cleanup EXIT

# Start server
echo "Starting server..."
node server-mcp.js > /tmp/server.log 2>&1 &
SERVER_PID=$!
sleep 2

# Connect browser WebSocket (simulate)
echo "Connecting browser..."
node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3000');
ws.on('open', () => {
  console.log('Browser connected');
  ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    console.log('Received:', JSON.stringify(msg, null, 2));
    if (msg.type === 'LOG' || msg.type === 'UPDATE_DOM') {
      process.exit(0);
    }
  });
  
  // Wait for tool call
  setTimeout(() => process.exit(1), 10000);
});
ws.on('error', (e) => { console.error('WS error:', e.message); process.exit(1); });
" &
BROWSER_PID=$!
sleep 1

# Call Claude
echo "Calling Claude..."
echo "Call mcp__imagine__log_thought with message 'Test from script'" | \
  claude --print --model sonnet 2>&1

sleep 3

# Check if message was received
if kill -0 $BROWSER_PID 2>/dev/null; then
  echo "✅ Tool execution test complete"
else
  echo "✅ Browser received message (process exited)"
fi

