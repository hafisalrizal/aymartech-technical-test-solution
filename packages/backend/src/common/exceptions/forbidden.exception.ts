import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorCode } from './base.exception';

/**
 * Exception thrown when user lacks permission for an action.
 * Returns HTTP 403 Forbidden.
 */
export class ForbiddenException extends BaseException {
  constructor(message = 'Forbidden') {
    super(message, ErrorCode.FORBIDDEN, HttpStatus.FORBIDDEN);
  }
}
