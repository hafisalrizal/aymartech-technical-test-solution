import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorCode } from './base.exception';

/**
 * Exception thrown when authentication fails or is missing.
 * Returns HTTP 401 Unauthorized.
 */
export class UnauthorizedException extends BaseException {
  constructor(message = 'Unauthorized') {
    super(message, ErrorCode.UNAUTHORIZED, HttpStatus.UNAUTHORIZED);
  }
}
