import { HttpStatus } from '@nestjs/common';
import { BaseException, ErrorCode } from './base.exception';

/**
 * Exception thrown when a requested resource is not found.
 * Returns HTTP 404 Not Found.
 */
export class NotFoundException extends BaseException {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, ErrorCode.NOT_FOUND, HttpStatus.NOT_FOUND);
  }
}
