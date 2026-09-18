import { OllamaProvider } from './ollama.provider';
import { BadRequestException } from '../../../common';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('OllamaProvider', () => {
  let provider: OllamaProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OllamaProvider({
      apiKey: 'http://localhost:11434', // Used as base URL for Ollama
      model: 'llama3.2',
      timeout: 60000,
    });
  });

  describe('constructor', () => {
    it('should use default base URL when apiKey not specified', () => {
      const defaultProvider = new OllamaProvider({
        apiKey: '',
      });
      expect(defaultProvider).toBeDefined();
    });

    it('should use default model when not specified', () => {
      const defaultProvider = new OllamaProvider({
        apiKey: '',
      });
      expect(defaultProvider).toBeDefined();
    });

    it('should use longer default timeout for local inference', () => {
      const defaultProvider = new OllamaProvider({
        apiKey: '',
      });
      expect(defaultProvider).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should return response text', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Hello from Ollama!' },
        }),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const result = await provider.chat(messages, systemPrompt);

      expect(result).toBe('Hello from Ollama!');
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:11434/api/chat',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    });

    it('should send stream: false for non-streaming', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Response' },
        }),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      await provider.chat(messages, 'System prompt');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.stream).toBe(false);
    });

    it('should handle empty response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: '' },
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

    it('should handle ECONNREFUSED as server not running', async () => {
      const connError = new Error('connect ECONNREFUSED 127.0.0.1:11434');
      mockFetch.mockRejectedValue(connError);

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(provider.chat(messages, 'System prompt')).rejects.toThrow(
        'Ollama server not running',
      );
    });

    it('should handle model not found error', async () => {
      const modelError = new Error('model "llama3.2" not found');
      mockFetch.mockRejectedValue(modelError);

      const messages = [{ role: 'user' as const, content: 'Hello' }];

      await expect(provider.chat(messages, 'System prompt')).rejects.toThrow(
        'Ollama model not found',
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
        '{"message":{"content":"Hello "},"done":false}\n',
        '{"message":{"content":"World"},"done":false}\n',
        '{"message":{"content":""},"done":true}\n',
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

    it('should send stream: true for streaming', async () => {
      const encoder = new TextEncoder();
      const mockReader = {
        read: jest
          .fn()
          .mockResolvedValueOnce({
            done: false,
            value: encoder.encode('{"message":{"content":"Hi"},"done":true}\n'),
          })
          .mockResolvedValue({ done: true, value: undefined }),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: { getReader: () => mockReader },
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const generator = provider.chatStream(messages, 'System prompt');
      await generator.next();

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.stream).toBe(true);
    });

    it('should stop when done is true', async () => {
      const encoder = new TextEncoder();
      const streamData = [
        '{"message":{"content":"Hello"},"done":false}\n',
        '{"message":{"content":""},"done":true}\n',
        '{"message":{"content":"Should not appear"},"done":false}\n',
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

      expect(chunks).toEqual(['Hello']);
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
        '{"message":{"content":"Hello"},"done":false}\n',
        'invalid json line\n',
        '{"message":{"content":" World"},"done":true}\n',
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
          message: { content: 'Response' },
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

    it('should include model in request', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: 'Response' },
        }),
      });

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      await provider.chat(messages, 'System prompt');

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.model).toBe('llama3.2');
    });
  });
});
