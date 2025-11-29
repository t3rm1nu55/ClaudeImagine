# Research: Autogen, Dify, Lian Adapter for Robust Session Management

## Current Claude CLI Limitations

### Session Management Issues:
1. **--print mode**: No state persistence between calls
2. **Session IDs**: Available but may not work in --print mode
3. **--continue**: Works but requires recent conversation
4. **No built-in conversation history**: Each call is independent

### Needs:
- Robust state management across sessions
- Conversation history persistence
- Multi-agent coordination
- Tool usage limits and budgets
- Thinking/reasoning mode
- Sub-agent delegation

## Option 1: AutoGen

### What is AutoGen?
- Microsoft's framework for multi-agent conversations
- Supports multiple LLM agents working together
- Built-in conversation management
- Tool/function calling support

### Pros:
- ✅ Multi-agent support
- ✅ Conversation persistence
- ✅ Tool orchestration
- ✅ Agent delegation
- ✅ Open source

### Cons:
- ⚠️ Python-based (we're Node.js)
- ⚠️ More complex setup
- ⚠️ May need API wrapper

### Integration Approach:
```python
# AutoGen could wrap Claude API
from autogen import ConversableAgent

claude_agent = ConversableAgent(
    name="claude",
    system_message="You are Claude",
    llm_config={
        "model": "claude-3-5-sonnet",
        "api_key": "...",
        "api_type": "anthropic"
    }
)
```

## Option 2: Dify

### What is Dify?
- LLM application development platform
- Workflow orchestration
- Built-in conversation management
- API-first design
- Supports Claude API

### Pros:
- ✅ Built-in session management
- ✅ Workflow orchestration
- ✅ API integration
- ✅ Conversation history
- ✅ Multi-agent support
- ✅ Tool/function calling
- ✅ Open source

### Cons:
- ⚠️ Requires Dify server setup
- ⚠️ Additional infrastructure
- ⚠️ Learning curve

### Integration Approach:
```bash
# Dify API endpoint
POST https://api.dify.ai/v1/chat-messages
{
  "inputs": {},
  "query": "user message",
  "response_mode": "streaming",
  "conversation_id": "session-id",
  "user": "user-id"
}
```

## Option 3: Lian Adapter

### What is Lian?
- Need to research - may be a Claude API adapter
- Could provide session management wrapper
- Might handle API calls with state

### Research Needed:
- Is this a real project?
- What does it provide?
- How does it work?

## Option 4: Custom Session Manager

### Build Our Own:
- Use Claude API directly
- Implement session management
- Store conversation history
- Manage state ourselves

### Architecture:
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ WebSocket
┌──────▼──────────────────┐
│  Session Manager        │
│  - Conversation History │
│  - State Management     │
│  - Tool Tracking        │
└──────┬──────────────────┘
       │ API Calls
┌──────▼──────┐
│ Claude API  │
└─────────────┘
```

### Implementation:
```javascript
class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.conversations = new Map();
  }

  async sendMessage(sessionId, message) {
    const session = this.sessions.get(sessionId) || this.createSession(sessionId);
    const conversation = this.conversations.get(sessionId) || [];
    
    conversation.push({ role: 'user', content: message });
    
    const response = await this.callClaude(conversation);
    
    conversation.push({ role: 'assistant', content: response });
    this.conversations.set(sessionId, conversation);
    
    return response;
  }
}
```

## Recommendation: Hybrid Approach

### Use Dify for Production:
1. **Setup Dify Server**: Deploy Dify instance
2. **Configure Claude API**: Add Claude as LLM provider
3. **Create Workflow**: Define conversation flow
4. **Use API**: Call Dify API from our server
5. **Get Benefits**: Session management, history, workflows

### Use Custom Manager for Development:
1. **Build Session Manager**: Simple state management
2. **Store History**: In-memory or database
3. **Manage Tools**: Track usage, limits
4. **Handle API**: Direct Claude API calls

## Implementation Plan

### Phase 1: Custom Session Manager (Quick)
- Build basic session management
- Store conversation history
- Track tool usage
- Implement limits

### Phase 2: Dify Integration (Robust)
- Setup Dify server
- Configure Claude API
- Create workflows
- Migrate to Dify API

### Phase 3: Advanced Features
- Multi-agent coordination
- Sub-agent delegation
- Thinking mode integration
- Advanced tool orchestration

## Next Steps

1. **Test Dify**: Setup and test Dify with Claude API
2. **Build Custom Manager**: Quick implementation for now
3. **Research Lian**: Find out what it is
4. **Evaluate AutoGen**: If Python integration is feasible
5. **Choose Solution**: Based on testing results

