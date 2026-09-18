/**
 * Integration tests for AI module.
 *
 * These tests require actual API keys and make real API calls.
 * They are skipped by default unless the corresponding environment
 * variables are set.
 *
 * To run these tests:
 *   AI_API_KEY=your-gemini-key pnpm test ai.integration
 *   AI_PROVIDER=ollama pnpm test ai.integration  # Requires Ollama running locally
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AiService } from './ai.service';
import { AiModule } from './ai.module';
import { configuration } from '../../config';

// Check if integration tests should run
const GEMINI_API_KEY = process.env.AI_API_KEY;
const AI_PROVIDER = process.env.AI_PROVIDER || 'gemini';
const SKIP_INTEGRATION = !GEMINI_API_KEY && AI_PROVIDER !== 'ollama';

const describeIf = (condition: boolean) => (condition ? describe : describe.skip);

describeIf(!SKIP_INTEGRATION)('AiService Integration', () => {
  let service: AiService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        AiModule,
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  }, 30000);

  afterAll(async () => {
    await module?.close();
  });

  describe('chat', () => {
    it(
      'should return a response from the AI provider',
      async () => {
        const messages = [
          { role: 'user' as const, content: 'Say "hello" and nothing else.' },
        ];
        const systemPrompt = 'You are a helpful assistant. Be very brief.';

        const response = await service.chat(messages, systemPrompt);

        expect(response).toBeDefined();
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
        expect(response.toLowerCase()).toContain('hello');
      },
      30000,
    );

    it(
      'should handle conversation history',
      async () => {
        const messages = [
          { role: 'user' as const, content: 'My name is TestUser.' },
          { role: 'assistant' as const, content: 'Nice to meet you, TestUser!' },
          { role: 'user' as const, content: 'What is my name?' },
        ];
        const systemPrompt = 'You are a helpful assistant. Be very brief.';

        const response = await service.chat(messages, systemPrompt);

        expect(response).toBeDefined();
        expect(response.toLowerCase()).toContain('testuser');
      },
      30000,
    );
  });

  describe('chatStream', () => {
    it(
      'should stream response chunks',
      async () => {
        const messages = [
          { role: 'user' as const, content: 'Count from 1 to 5.' },
        ];
        const systemPrompt = 'You are a helpful assistant. Be very brief.';

        const chunks: string[] = [];
        for await (const chunk of service.chatStream(messages, systemPrompt)) {
          chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
        const fullResponse = chunks.join('');
        expect(fullResponse).toContain('1');
        expect(fullResponse).toContain('5');
      },
      30000,
    );

    it(
      'should yield multiple chunks for longer responses',
      async () => {
        const messages = [
          {
            role: 'user' as const,
            content: 'Write a short paragraph about the sky.',
          },
        ];
        const systemPrompt = 'You are a helpful assistant.';

        const chunks: string[] = [];
        for await (const chunk of service.chatStream(messages, systemPrompt)) {
          chunks.push(chunk);
        }

        // Streaming should produce multiple chunks for longer content
        expect(chunks.length).toBeGreaterThan(1);
      },
      30000,
    );
  });

  describe('getProviderType', () => {
    it('should return the configured provider type', () => {
      const providerType = service.getProviderType();

      expect(['gemini', 'openrouter', 'ollama']).toContain(providerType);
      expect(providerType).toBe(AI_PROVIDER);
    });
  });
});

// Ollama-specific tests (only run when Ollama provider is configured)
describeIf(AI_PROVIDER === 'ollama')('OllamaProvider Integration', () => {
  let service: AiService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [configuration],
        }),
        AiModule,
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  }, 60000);

  afterAll(async () => {
    await module?.close();
  });

  it('should use Ollama provider', () => {
    expect(service.getProviderType()).toBe('ollama');
  });

  it(
    'should handle local inference',
    async () => {
      const messages = [
        { role: 'user' as const, content: 'Say "hi" only.' },
      ];

      const response = await service.chat(messages, 'Be brief.');

      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(0);
    },
    60000,
  );
});
