import { Tool, ToolResult } from '../../types.js';

let recognition: any = null;

export function createSpeechTools(): Array<{ tool: Tool; handler: (params: any) => Promise<ToolResult> }> {
  return [
    {
      tool: {
        name: 'speech_recognition:start',
        description: 'Start speech recognition (speech-to-text)',
        inputSchema: {
          type: 'object',
          properties: {
            continuous: { type: 'boolean', default: true },
            interimResults: { type: 'boolean', default: true },
            lang: { type: 'string', default: 'en-US' },
          },
        },
      },
      handler: async (params) => {
        try {
          const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (!SpeechRecognition) {
            return { success: false, error: 'Speech recognition not supported in this browser' };
          }

          recognition = new SpeechRecognition();
          recognition.continuous = params.continuous !== false;
          recognition.interimResults = params.interimResults !== false;
          recognition.lang = params.lang || 'en-US';

          recognition.start();

          return { success: true, data: { message: 'Speech recognition started' } };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'speech_recognition:stop',
        description: 'Stop speech recognition',
        inputSchema: {
          type: 'object',
          properties: {},
        },
      },
      handler: async () => {
        try {
          if (recognition) {
            recognition.stop();
            recognition = null;
          }
          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
    {
      tool: {
        name: 'speech_synthesis:speak',
        description: 'Speak text using text-to-speech',
        inputSchema: {
          type: 'object',
          properties: {
            text: { type: 'string', description: 'Text to speak' },
            lang: { type: 'string', default: 'en-US' },
            rate: { type: 'number', default: 1 },
            pitch: { type: 'number', default: 1 },
            volume: { type: 'number', default: 1 },
          },
          required: ['text'],
        },
      },
      handler: async (params) => {
        try {
          if (!('speechSynthesis' in window)) {
            return { success: false, error: 'Speech synthesis not supported in this browser' };
          }

          const utterance = new SpeechSynthesisUtterance(params.text);
          utterance.lang = params.lang || 'en-US';
          utterance.rate = params.rate || 1;
          utterance.pitch = params.pitch || 1;
          utterance.volume = params.volume || 1;

          window.speechSynthesis.speak(utterance);

          return { success: true };
        } catch (error) {
          return { success: false, error: String(error) };
        }
      },
    },
  ];
}

