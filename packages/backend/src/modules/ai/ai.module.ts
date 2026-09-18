import { Module } from '@nestjs/common';
import { AiService } from './ai.service';

/**
 * Module providing AI capabilities with provider abstraction.
 * Supports Gemini, OpenRouter, and Ollama providers.
 */
@Module({
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
