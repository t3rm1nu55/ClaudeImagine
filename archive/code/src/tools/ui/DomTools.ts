import DOMPurify from 'dompurify';
import morphdom from 'morphdom';
import { Tool, ToolResult } from '../../types.js';
import { WindowManager } from './WindowTools.js';

export function createDomTools(windowManager: WindowManager): Array<{ tool: Tool; handler: (params: any) => ToolResult }> {
  return [
    {
      tool: {
        name: 'dom_replace_html',
        description: 'Replace the HTML content of an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector or window ID' },
            html: { type: 'string', description: 'HTML content to insert' },
          },
          required: ['selector', 'html'],
        },
      },
      handler: (params) => {
        try {
          let targetElement: HTMLElement | null = null;
          
          // Check if selector is a window ID
          const windowContent = windowManager.getWindowContentElement(params.selector);
          if (windowContent) {
            targetElement = windowContent;
          } else {
            targetElement = document.querySelector(params.selector);
          }
          
          if (!targetElement) {
            return { success: false, error: `Element not found: ${params.selector}` };
          }

          // Sanitize HTML
          const sanitizedHtml = DOMPurify.sanitize(params.html, {
            ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'button', 'input', 'form', 'label', 'select', 'option', 'textarea', 'canvas', 'video', 'audio', 'svg', 'path', 'circle', 'rect', 'line', 'text', 'g'],
            ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'width', 'height', 'style', 'type', 'value', 'name', 'placeholder', 'for', 'role', 'aria-label', 'data-*'],
          });

          // Create temporary container
          const temp = document.createElement('div');
          temp.innerHTML = sanitizedHtml;

          // Use morphdom for efficient patching
          morphdom(targetElement, temp);

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'dom_append_html',
        description: 'Append HTML content to an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector or window ID' },
            html: { type: 'string', description: 'HTML content to append' },
          },
          required: ['selector', 'html'],
        },
      },
      handler: (params) => {
        try {
          let targetElement: HTMLElement | null = null;
          
          const windowContent = windowManager.getWindowContentElement(params.selector);
          if (windowContent) {
            targetElement = windowContent;
          } else {
            targetElement = document.querySelector(params.selector);
          }
          
          if (!targetElement) {
            return { success: false, error: `Element not found: ${params.selector}` };
          }

          const sanitizedHtml = DOMPurify.sanitize(params.html, {
            ALLOWED_TAGS: ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'ul', 'ol', 'li', 'table', 'tr', 'td', 'th', 'thead', 'tbody', 'button', 'input', 'form', 'label', 'select', 'option', 'textarea', 'canvas', 'video', 'audio', 'svg', 'path', 'circle', 'rect', 'line', 'text', 'g'],
            ALLOWED_ATTR: ['class', 'id', 'href', 'src', 'alt', 'width', 'height', 'style', 'type', 'value', 'name', 'placeholder', 'for', 'role', 'aria-label', 'data-*'],
          });

          const temp = document.createElement('div');
          temp.innerHTML = sanitizedHtml;
          
          while (temp.firstChild) {
            targetElement.appendChild(temp.firstChild);
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'dom_classes_replace',
        description: 'Replace CSS classes on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            classes: { type: 'array', items: { type: 'string' }, description: 'Array of class names' },
          },
          required: ['selector', 'classes'],
        },
      },
      handler: (params) => {
        const element = document.querySelector(params.selector);
        if (!element) {
          return { success: false, error: `Element not found: ${params.selector}` };
        }
        element.className = params.classes.join(' ');
        return { success: true };
      },
    },
    {
      tool: {
        name: 'dom_set_attr',
        description: 'Set an attribute on an element',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
            attr: { type: 'string', description: 'Attribute name' },
            value: { type: 'string', description: 'Attribute value' },
          },
          required: ['selector', 'attr', 'value'],
        },
      },
      handler: (params) => {
        const element = document.querySelector(params.selector);
        if (!element) {
          return { success: false, error: `Element not found: ${params.selector}` };
        }
        element.setAttribute(params.attr, params.value);
        return { success: true };
      },
    },
    {
      tool: {
        name: 'dom_remove',
        description: 'Remove an element from the DOM',
        inputSchema: {
          type: 'object',
          properties: {
            selector: { type: 'string', description: 'CSS selector' },
          },
          required: ['selector'],
        },
      },
      handler: (params) => {
        const element = document.querySelector(params.selector);
        if (!element) {
          return { success: false, error: `Element not found: ${params.selector}` };
        }
        element.remove();
        return { success: true };
      },
    },
  ];
}

