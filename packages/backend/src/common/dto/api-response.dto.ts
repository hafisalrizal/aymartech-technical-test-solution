import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../exceptions';

/**
 * Standard API success response DTO for Swagger documentation
 */
export class ApiResponseDto<T> {
  @ApiProperty({ description: 'Response data' })
  data: T;

  @ApiPropertyOptional({ description: 'Success message' })
  message?: string;
}

/**
 * Standard API error response DTO for Swagger documentation
 */
export class ApiErrorResponseDto {
  @ApiProperty({ description: 'Error message' })
  message: string;

  @ApiProperty({
    description: 'Error code',
    enum: ErrorCode,
  })
  code: ErrorCode;

  @ApiPropertyOptional({
    description: 'Validation errors by field',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { type: 'string' },
    },
  })
  errors?: Record<string, string[]>;
}
