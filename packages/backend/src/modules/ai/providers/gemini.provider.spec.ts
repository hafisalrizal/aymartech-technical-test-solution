import { GeminiProvider } from './gemini.provider';
import { BadRequestException } from '../../../common';

// Mock the Google Generative AI SDK
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      startChat: jest.fn().mockReturnValue({
        sendMessage: jest.fn(),
        sendMessageStream: jest.fn(),
      }),
    }),
  })),
  Content: {},
}));

describe('GeminiProvider', () => {
  let provider: GeminiProvider;
  let mockSendMessage: jest.Mock;
  let mockSendMessageStream: jest.Mock;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock responses
    mockSendMessage = jest.fn().mockResolvedValue({
      response: {
        text: () => 'Hello from Gemini!',
      },
    });

    mockSendMessageStream = jest.fn().mockResolvedValue({
      stream: (async function* () {
        yield { text: () => 'Hello ' };
        yield { text: () => 'from ' };
        yield { text: () => 'Gemini!' };
      })(),
    });

    // Update mock implementation
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    GoogleGenerativeAI.mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        startChat: jest.fn().mockReturnValue({
          sendMessage: mockSendMessage,
          sendMessageStream: mockSendMessageStream,
        }),
      }),
    }));

    provider = new GeminiProvider({
      apiKey: 'test-api-key',
      model: 'gemini-1.5-flash',
      timeout: 30000,
    });
  });

  describe('constructor', () => {
    it('should use default model when not specified', () => {
      const defaultProvider = new GeminiProvider({
        apiKey: 'test-key',
      });
      expect(defaultProvider).toBeDefined();
    });

    it('should use custom model when specified', () => {
      const customProvider = new GeminiProvider({
        apiKey: 'test-key',
        model: 'gemini-pro',
      });
      expect(customProvider).toBeDefined();
    });
  });

  describe('chat', () => {
    it('should return response text', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const result = await provider.chat(messages, systemPrompt);

      expect(result).toBe('Hello from Gemini!');
    });

    it('should throw BadRequestException when last message is not from user', async () => {
      const messages = [{ role: 'assistant' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      await expect(provider.chat(messages, systemPrompt)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when messages array is empty', async () => {
      const messages: { role: 'user' | 'assistant'; content: string }[] = [];
      const systemPrompt = 'You are a helpful assistant';

      await expect(provider.chat(messages, systemPrompt)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle API errors gracefully', async () => {
      mockSendMessage.mockRejectedValue(new Error('API rate limit exceeded'));

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      await expect(provider.chat(messages, systemPrompt)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should handle safety filter errors', async () => {
      mockSendMessage.mockRejectedValue(new Error('SAFETY filter triggered'));

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      await expect(provider.chat(messages, systemPrompt)).rejects.toThrow(
        'Response blocked due to safety filters',
      );
    });
  });

  describe('chatStream', () => {
    it('should yield response chunks', async () => {
      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const chunks: string[] = [];
      for await (const chunk of provider.chatStream(messages, systemPrompt)) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello ', 'from ', 'Gemini!']);
    });

    it('should throw BadRequestException when last message is not from user', async () => {
      const messages = [{ role: 'assistant' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const generator = provider.chatStream(messages, systemPrompt);

      await expect(generator.next()).rejects.toThrow(BadRequestException);
    });

    it('should handle stream errors gracefully', async () => {
      mockSendMessageStream.mockRejectedValue(new Error('Stream error'));

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      const generator = provider.chatStream(messages, systemPrompt);

      await expect(generator.next()).rejects.toThrow(BadRequestException);
    });
  });

  describe('timeout handling', () => {
    it('should handle AbortError as timeout', async () => {
      const abortError = new Error('aborted');
      abortError.name = 'AbortError';
      mockSendMessage.mockRejectedValue(abortError);

      const messages = [{ role: 'user' as const, content: 'Hello' }];
      const systemPrompt = 'You are a helpful assistant';

      await expect(provider.chat(messages, systemPrompt)).rejects.toThrow(
        'AI request timed out',
      );
    });
  });
});
