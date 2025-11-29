# Testing Guide

## What Has Been Tested

### ✅ Completed

1. **Dependencies Installation**
   - All npm packages installed successfully
   - TypeScript compilation works
   - Build process completes without errors

2. **TypeScript Compilation**
   - All TypeScript files compile successfully
   - No type errors
   - Build output generated in `dist/`

3. **Code Structure**
   - MCP Server implementation complete
   - WebSocket transport layer implemented
   - All tool categories implemented:
     - UI manipulation tools
     - Content generation tools
     - Device API tools
     - System tools

### ⚠️ Requires Manual Testing

The following components require manual testing in a browser environment:

1. **Browser Integration**
   - WebSocket connection establishment
   - Message serialization/deserialization
   - Tool execution in browser context
   - DOM manipulation with morphdom
   - HTML sanitization with DOMPurify

2. **Tool Functionality**
   - Window creation and management
   - DOM manipulation tools
   - Chart.js rendering
   - Google Maps integration (requires API key)
   - Screenshot capture
   - QR code generation
   - Camera/microphone access (requires permissions)
   - Speech recognition/synthesis
   - Geolocation

3. **Claude API Integration**
   - WebSocket server connection
   - Message forwarding to Claude API
   - Tool call handling
   - Response processing

## How to Test

### 1. Basic Functionality Test

```bash
# Terminal 1: Start the server
npm run server

# Terminal 2: Start the dev server
npm run dev
```

Then:
1. Open `http://localhost:3000` in your browser
2. Open browser DevTools console
3. Check for WebSocket connection messages
4. Try sending a message through the chat interface

### 2. Tool Testing

Test individual tools by sending messages like:
- "Create a window titled 'Test'"
- "Create a chart showing [1,2,3,4,5]"
- "Show me a map of San Francisco"
- "Generate a QR code for 'https://example.com'"

### 3. Integration Testing

1. Set `ANTHROPIC_API_KEY` environment variable
2. Start the server: `ANTHROPIC_API_KEY=your-key npm run server`
3. Start the client: `npm run dev`
4. Send a complex request that requires multiple tools
5. Verify that Claude calls tools in sequence
6. Verify that the UI updates correctly

### 4. Permission Testing

Test the permission system:
1. Request camera access
2. Request microphone access
3. Request geolocation
4. Verify permission dialogs appear
5. Test "Allow once" vs "Always allow"
6. Verify permissions persist across sessions

## Known Limitations

1. **Claude API Integration**: The server adapter is a basic implementation. Full integration requires:
   - Proper tool result forwarding back to Claude
   - Streaming response handling
   - Conversation state management
   - Error handling and retries

2. **Google Maps**: Requires a valid API key to test

3. **Device APIs**: Require HTTPS in production (localhost works for development)

4. **Testing Framework**: No automated test framework set up yet. Tests would need:
   - Jest or Vitest for unit tests
   - Playwright or Puppeteer for browser tests
   - Mock WebSocket server for integration tests

## Next Steps for Full Testing

1. Set up a proper test framework (Jest/Vitest)
2. Create unit tests for individual tools
3. Create integration tests with a mock WebSocket server
4. Create E2E tests with Playwright
5. Add CI/CD pipeline for automated testing

