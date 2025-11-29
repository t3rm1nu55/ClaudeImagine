/**
 * Test Main Entry Point
 * 
 * Simplified version for testing that connects to server.js
 * and handles the update_ui and log_thought tools.
 */

import morphdom from 'morphdom';
import DOMPurify from 'dompurify';

const WS_URL = 'ws://localhost:3001/ws';
let ws: WebSocket | null = null;
let isConnected = false;

const mainContainer = document.getElementById('main-container')!;
const thoughtsContainer = document.getElementById('thoughts-container')!;
const logsContainer = document.getElementById('logs-container')!;
const waitingPlaceholder = document.getElementById('waiting-placeholder')!;

function log(message: string) {
  const logEntry = document.createElement('div');
  logEntry.className = 'log-entry';
  logEntry.textContent = message;
  logsContainer.appendChild(logEntry);
  logsContainer.scrollTop = logsContainer.scrollHeight;
}

function addThought(message: string) {
  const thoughtEntry = document.createElement('div');
  thoughtEntry.className = 'log-entry';
  thoughtEntry.textContent = message;
  thoughtsContainer.appendChild(thoughtEntry);
  thoughtsContainer.scrollTop = thoughtsContainer.scrollHeight;
}

function connect() {
  log('Connecting to Relay...');
  
  ws = new WebSocket(WS_URL);
  
  ws.onopen = () => {
    isConnected = true;
    log('Connected to Relay');
    console.log('Connected to WebSocket server');
  };
  
  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      handleMessage(message);
    } catch (error) {
      console.error('Error parsing message:', error);
    }
  };
  
  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
    log('Connection error');
  };
  
  ws.onclose = () => {
    isConnected = false;
    log('Disconnected from Relay');
    console.log('WebSocket closed');
    
    // Reconnect after 3 seconds
    setTimeout(() => {
      if (!isConnected) {
        connect();
      }
    }, 3000);
  };
}

function handleMessage(message: any) {
  if (message.method === 'ui/update') {
    const html = message.params?.html || '';
    updateUI(html);
  } else if (message.method === 'log/thought') {
    const msg = message.params?.message || '';
    addThought(msg);
  } else if (message.method === 'connected') {
    log(`Connected (Conversation: ${message.params?.conversationId || 'unknown'})`);
  }
}

function updateUI(html: string) {
  // Hide waiting placeholder
  if (waitingPlaceholder) {
    waitingPlaceholder.style.display = 'none';
  }
  
  // Sanitize HTML
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'button', 'input', 'form', 'label', 'select', 'option', 'textarea', 'canvas', 'video', 'audio', 'svg', 'path', 'circle', 'rect', 'line', 'text', 'g', 'script'],
    ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'width', 'height', 'style', 'type', 'value', 'name', 'placeholder', 'for', 'role', 'aria-label', 'data-*', 'onclick', 'onchange', 'oninput'],
  });
  
  // Create temporary container
  const temp = document.createElement('div');
  temp.innerHTML = sanitized;
  
  // Use morphdom for efficient patching
  morphdom(mainContainer, temp);
  
  // Execute any scripts that were injected
  const scripts = mainContainer.querySelectorAll('script');
  scripts.forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.appendChild(document.createTextNode(oldScript.innerHTML));
    oldScript.parentNode?.replaceChild(newScript, oldScript);
  });
  
  log('UI updated');
}

// Initialize connection
connect();

// Export for testing
(window as any).testMain = {
  updateUI,
  addThought,
  log,
  connect,
  isConnected: () => isConnected
};

