import { OpenRouterProvider } from './openrouter.provider';
import { BadRequestException } from '../../../common';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OpenRouterProvider', () => {
  let provider: OpenRouterProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenRouterProvider({
      apiKey: 'test-api-key',
      model: 'google/gemini-flash-1.5',
      timeout: 30000,
    });
  });

  describe('constructor', () => {
    it('should use default model when not specified', () => {
      const defaultProvider = new OpenRouterProvider({
        apiKey: 'test-key',
      });
      expect(defaultProvider).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should return response text', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Hello from OpenRouter!' } }],
        }),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const result = await provider.chat(messages, systemPrompt);

      expect(result).toBe('Hello from OpenRouter!');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '' } }],
        }),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const result = await provider.chat(messages, 'System prompt');

      expect(result).toBe('');
    });

    it('should throw BadRequestException on API error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(provider.chat(messages, 'System prompt')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle 401 error as configuration error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => '401 Unauthorized',
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(provider.chat(messages, 'System prompt')).rejects.toThrow(
        'AI service configuration error',
      );
    });

    it('should handle 429 rate limit error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => '429 Rate Limited',
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(provider.chat(messages, 'System prompt')).rejects.toThrow(
        'AI service rate limited',
      );
    });

    it('should handle AbortError as timeout', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValue(abortError);

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(provider.chat(messages, 'System prompt')).rejects.toThrow(
        'AI request timed out',
      );
    });
  });

  describe('chatStream', () => {
    it('should yield response chunks', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'data: {"choices":[{"delta":{"content":"Hello "}}]}\n',
        'data: {"choices":[{"delta":{"content":"World"}}]}\n',
        'data: [DONE]\n',
      ];

      let chunkIndex = 0;
      const mockReader = {
        read: jest.fn().mockImplementation(async () => {
          if (chunkIndex < streamData.length) {
            return {
              done: false,
              value: encoder.encode(streamData[chunkIndex++]),
            };
          }
          return { done: true, value: undefined };
        }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const chunks: string[] = [];

      for await (const chunk of provider.chatStream(messages, 'System prompt')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello ', 'World']);
    });

    it('should handle stream with no body', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        body: null,
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const generator = provider.chatStream(messages, 'System prompt');

      await expect(generator.next()).rejects.toThrow(BadRequestException);
    });

    it('should skip malformed JSON chunks', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        'data: {"choices":[{"delta":{"content":"Hello"}}]}\n',
        'data: {invalid json}\n',
        'data: {"choices":[{"delta":{"content":" World"}}]}\n',
      ];

      let chunkIndex = 0;
      const mockReader = {
        read: jest.fn().mockImplementation(async () => {
          if (chunkIndex < streamData.length) {
            return {
              done: false,
              value: encoder.encode(streamData[chunkIndex++]),
            };
          }
          return { done: true, value: undefined };
        }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const chunks: string[] = [];

      for await (const chunk of provider.chatStream(messages, 'System prompt')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' World']);
    });
  });

  describe('message conversion', () => {
    it('should include system prompt as first message', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      await provider.chat(messages, 'Custom system prompt');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.messages[0]).toEqual({
        role: 'system',
        content: 'Custom system prompt',
      });
    });

    it('should filter out system messages from input', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Response' } }],
        }),
      });

      const messages = [
        { role: 'system' as const, content: 'Old system' },
        { role: 'user' as const, content: 'Hello' },
      ];
      await provider.chat(messages, 'New system prompt');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Should have system prompt + user message, not the old system message
      expect(callBody.messages).toHaveLength(2);
      expect(callBody.messages[0].content).toBe('New system prompt');
      expect(callBody.messages[1].content).toBe('Hello');
    });
  });
});
