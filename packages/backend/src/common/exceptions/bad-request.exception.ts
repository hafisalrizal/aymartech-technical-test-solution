import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorCode } from './base.exception';

/**
 * Exception thrown when the request is malformed or invalid.
 * Returns HTTP 400 Bad Request.
 */
export class BadRequestException extends BaseException {
  constructor(
    message = 'Bad request',
    errors?: Record<string, string[]>,
  ) {
    super(
      message,
      errors ? ErrorCode.VALIDATION_ERROR : ErrorCode.BAD_REQUEST,
      HttpStatus.BAD_REQUEST,
      errors,
    );
  }
}
