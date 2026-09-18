import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AiService } from './ai.service';

describe('AiService', () => {
  const createTestingModule = async (configOverrides: Record<string, unknown> = {}) => {
    const defaultConfig: Record<string, unknown> = {
      'ai.provider': 'gemini',
      'ai.apiKey': 'test-api-key',
      'ai.model': undefined,
      'ai.timeout': 30000,
      ...configOverrides,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => defaultConfig[key]),
          },
        },
      ],
    }).compile();

    // Initialize the module to trigger onModuleInit
    await module.init();

    return module;
  };

  describe('Provider Factory', () => {
    it('should initialize Gemini provider when AI_PROVIDER=gemini', async () => {
      const module = await createTestingModule({ 'ai.provider': 'gemini' });
      const service = module.get<AiService>(AiService);

      expect(service.getProviderType()).toBe('gemini');
      await module.close();
    });

    it('should initialize OpenRouter provider when AI_PROVIDER=openrouter', async () => {
      const module = await createTestingModule({ 'ai.provider': 'openrouter' });
      const service = module.get<AiService>(AiService);

      expect(service.getProviderType()).toBe('openrouter');
      await module.close();
    });

    it('should initialize Ollama provider when AI_PROVIDER=ollama', async () => {
      const module = await createTestingModule({
        'ai.provider': 'ollama',
        'ai.apiKey': '', // Ollama doesn't require API key
      });
      const service = module.get<AiService>(AiService);

      expect(service.getProviderType()).toBe('ollama');
      await module.close();
    });

    it('should default to Gemini when AI_PROVIDER is not set', async () => {
      const module = await createTestingModule({ 'ai.provider': undefined });
      const service = module.get<AiService>(AiService);

      expect(service.getProviderType()).toBe('gemini');
      await module.close();
    });
  });

  describe('API Key Validation', () => {
    it('should throw error when Gemini provider has no API key', async () => {
      await expect(
        createTestingModule({
          'ai.provider': 'gemini',
          'ai.apiKey': '',
        }),
      ).rejects.toThrow('AI_API_KEY environment variable is required for gemini provider');
    });

    it('should throw error when OpenRouter provider has no API key', async () => {
      await expect(
        createTestingModule({
          'ai.provider': 'openrouter',
          'ai.apiKey': '',
        }),
      ).rejects.toThrow('AI_API_KEY environment variable is required for openrouter provider');
    });

    it('should not throw error when Ollama provider has no API key', async () => {
      const module = await createTestingModule({
        'ai.provider': 'ollama',
        'ai.apiKey': '',
      });
      const service = module.get<AiService>(AiService);

      expect(service.getProviderType()).toBe('ollama');
      await module.close();
    });
  });

  describe('Invalid Provider', () => {
    it('should throw error for unknown provider', async () => {
      await expect(
        createTestingModule({
          'ai.provider': 'invalid-provider',
          'ai.apiKey': 'test-key',
        }),
      ).rejects.toThrow('Unknown AI provider: invalid-provider');
    });
  });

  describe('Chat Methods', () => {
    let module: TestingModule;
    let service: AiService;

    beforeEach(async () => {
      // Use Ollama for these tests since we mock the provider anyway
      module = await createTestingModule({
        'ai.provider': 'ollama',
        'ai.apiKey': '',
      });
      service = module.get<AiService>(AiService);
    });

    afterEach(async () => {
      await module?.close();
    });

    it('should have chat method', () => {
      expect(typeof service.chat).toBe('function');
    });

    it('should have chatStream method', () => {
      expect(typeof service.chatStream).toBe('function');
    });

    it('should have getProviderType method', () => {
      expect(typeof service.getProviderType).toBe('function');
    });
  });
});
