import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

enum Environment {
  Local = 'local',
  Staging = 'staging',
  Production = 'production',
}

enum AiProvider {
  Gemini = 'gemini',
  OpenRouter = 'openrouter',
  Ollama = 'ollama',
}

class EnvironmentVariables {
  // Optional with defaults
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Local;

  @IsNumber()
  @IsOptional()
  PORT: number = 3000;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:5173';

  // Required - app will not start without these
  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty({ message: 'JWT_SECRET is required' })
  JWT_SECRET: string;

  @IsEnum(AiProvider, {
    message: 'AI_PROVIDER must be one of: gemini, openrouter, ollama',
  })
  @IsNotEmpty({ message: 'AI_PROVIDER is required' })
  AI_PROVIDER: AiProvider;

  @IsString()
  @IsNotEmpty({ message: 'AI_API_KEY is required' })
  AI_API_KEY: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const messages = errors
      .map((error) => {
        const constraints = Object.values(error.constraints || {});
        return `  - ${error.property}: ${constraints.join(', ')}`;
      })
      .join('\n');
    throw new Error(`\n\nEnvironment validation failed:\n${messages}\n`);
  }
  return validatedConfig;
}
