import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Error codes used throughout the application
 */
export enum ErrorCode {
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AI_ERROR = 'AI_ERROR',
}

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  message: string;
  code: ErrorCode;
  errors?: Record<string, string[]>;
}

/**
 * Base exception class for all custom exceptions.
 * Extends HttpException to integrate with NestJS exception handling.
 */
export abstract class BaseException extends HttpException {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    status: HttpStatus,
    public readonly errors?: Record<string, string[]>,
  ) {
    super({ message, code, errors }, status);
  }

  /**
   * Returns the error response object
   */
  getErrorResponse(): ErrorResponse {
    return {
      message: this.message,
      code: this.code,
      errors: this.errors,
    };
  }
}
