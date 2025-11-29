# Conversation Management

## Overview

This document explains how to read and manage conversation IDs in Claude Code instances, and how to configure conversation history storage for isolated instances.

## Conversation IDs

### What Are Conversation IDs?

Conversation IDs (also called session IDs) are unique identifiers for each Claude conversation. They allow you to:
- Continue conversations across multiple calls
- Track conversation history
- Resume previous conversations
- Manage multiple concurrent conversations

### Format

Conversation IDs are UUIDs (e.g., `123e4567-e89b-12d3-a456-426614174000`).

### Getting Conversation IDs

#### Method 1: Extract from JSON Output

```javascript
import { extractConversationId } from './utils/conversation-manager.js';

const jsonOutput = `{"content": "Hello", "session_id": "123e4567-..."}`;
const id = extractConversationId(jsonOutput);
console.log(id); // "123e4567-..."
```

#### Method 2: Get from Claude CLI

```javascript
import { getConversationId } from './utils/conversation-manager.js';

const id = await getConversationId('Hello', {
  model: 'sonnet',
  authToken: process.env.ANTHROPIC_API_KEY
});
console.log(id); // Conversation ID
```

#### Method 3: Using --output-format json

```bash
claude --print --output-format json "Hello" | jq -r '.session_id'
```

## Conversation History Storage

### Default Location

By default, Claude Code stores conversation history in:
```
~/.claude/projects/
```

Each project has a directory, and conversations are stored as `.jsonl` files named with session IDs.

### Configuring Storage Location

For isolated instances, you can configure where conversation history is stored using the `CLAUDE_CONFIG_DIR` environment variable.

#### Backend Instances

Backend instances automatically configure conversation history to be stored in:
```
{instance-path}/.claude/projects/
```

This ensures each backend instance has its own isolated conversation history.

#### Isolated Instances

When creating isolated instances, conversation history is stored in the temporary config directory:
```javascript
import { createIsolatedClaude } from './create-isolated-claude.js';

// Conversation history stored in temp directory
const result = await createIsolatedClaude('Hello', {
  tempDir: '/path/to/temp/config'
});
// History stored in: /path/to/temp/config/projects/
```

## Managing Conversations

### List Conversations

```javascript
import { listConversations } from './utils/conversation-manager.js';

const conversations = await listConversations('/path/to/instance');

conversations.forEach(conv => {
  console.log(`Session: ${conv.sessionId}`);
  console.log(`Project: ${conv.project}`);
  console.log(`Modified: ${conv.modified}`);
});
```

### Read Conversation History

```javascript
import { readConversation } from './utils/conversation-manager.js';

const messages = await readConversation('/path/to/conversation.jsonl');

messages.forEach(msg => {
  console.log(`${msg.role}: ${msg.content}`);
});
```

### Get Recent Conversation ID

```javascript
import { getRecentConversationId } from './utils/conversation-manager.js';

const recentId = await getRecentConversationId('/path/to/instance');
console.log(`Most recent: ${recentId}`);
```

## Configuration

### Configure Conversation History Location

```javascript
import { configureConversationHistory } from './utils/conversation-manager.js';

const config = configureConversationHistory('/path/to/instance');

// Use in environment
process.env.CLAUDE_CONFIG_DIR = config.CLAUDE_CONFIG_DIR;
```

### Backend Instance Configuration

Backend instances automatically configure conversation history:

```bash
# Start script sets CLAUDE_CONFIG_DIR
cd ~/my-backend-instance
./start.sh

# Conversation history stored in:
# ~/my-backend-instance/.claude/projects/
```

## Usage Examples

### Continue a Conversation

```javascript
import { getConversationId } from './utils/conversation-manager.js';
import { spawn } from 'child_process';

// Get conversation ID
const id = await getConversationId('Hello', { model: 'sonnet' });

// Continue conversation
const claude = spawn('claude', [
  '--print',
  '--model', 'sonnet',
  '--session-id', id,
  'What did we discuss?'
]);
```

### Track Multiple Conversations

```javascript
import { getConversationId } from './utils/conversation-manager.js';

const conversations = new Map();

async function sendMessage(conversationKey, message) {
  let sessionId = conversations.get(conversationKey);
  
  if (!sessionId) {
    // Start new conversation
    sessionId = await getConversationId(message, { model: 'sonnet' });
    conversations.set(conversationKey, sessionId);
  }
  
  // Continue conversation with sessionId
  // ...
}
```

### Isolated Instance with History

```javascript
import { createIsolatedClaude } from './create-isolated-claude.js';
import { configureConversationHistory } from './utils/conversation-manager.js';

const instancePath = '/path/to/instance';
const config = configureConversationHistory(instancePath);

// Set environment
process.env.CLAUDE_CONFIG_DIR = config.CLAUDE_CONFIG_DIR;

// Create instance - history stored in instance directory
const result = await createIsolatedClaude('Hello', {
  tempDir: instancePath
});
```

## Testing

Run the conversation management test suite:

```bash
npm run test:conversations
```

This tests:
- Conversation ID extraction
- Getting conversation IDs from Claude CLI
- Configuring conversation history location
- Listing conversations
- Reading conversation files

## Best Practices

1. **Isolate Conversation History**: Each backend instance should have its own conversation history directory
2. **Track Conversation IDs**: Store conversation IDs if you need to resume conversations
3. **Clean Up**: Remove old conversation files periodically
4. **Backup Important Conversations**: Save important conversation history files
5. **Use --continue**: Use `--continue` flag for recent conversations instead of managing IDs manually

## Troubleshooting

### Conversation IDs Not Found

If conversation IDs are not appearing:
- Ensure `--output-format json` is used
- Check that Claude CLI version supports session IDs
- Verify API key is set correctly

### Conversation History Not Isolated

If conversation history is not isolated:
- Verify `CLAUDE_CONFIG_DIR` is set correctly
- Check that instance directory has `.claude` subdirectory
- Ensure start script sets `CLAUDE_CONFIG_DIR`

### Cannot Read Conversation Files

If conversation files cannot be read:
- Check file permissions
- Verify `.jsonl` file format
- Ensure directory exists

## See Also

- `utils/conversation-manager.js` - Conversation management utilities
- `test-conversation-management.js` - Test suite
- `playbooks/create-backend-instance.js` - Backend instance creation
- `create-isolated-claude.js` - Isolated instance creation

