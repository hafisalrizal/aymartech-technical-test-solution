import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FastifyReply } from 'fastify';
import { BaseException, ErrorCode, ErrorResponse } from '../exceptions';

/**
 * Global exception filter that formats all exceptions
 * into a consistent error response structure.
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  /**
   * Catches and transforms exceptions into standard error responses
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status: number;
    let errorResponse: ErrorResponse;

    if (exception instanceof BaseException) {
      // Custom application exceptions
      status = exception.getStatus();
      errorResponse = exception.getErrorResponse();
    } else if (exception instanceof HttpException) {
      // NestJS built-in exceptions (e.g., validation errors)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;

        // Handle validation pipe errors
        if (Array.isArray(resp.message)) {
          const errors: Record<string, string[]> = {};
          for (const msg of resp.message as string[]) {
            const field = msg.split(' ')[0] || 'general';
            if (!errors[field]) {
              errors[field] = [];
            }
            errors[field].push(msg);
          }
          errorResponse = {
            message: 'Validation failed',
            code: ErrorCode.VALIDATION_ERROR,
            errors,
          };
        } else {
          errorResponse = {
            message: (resp.message as string) || 'An error occurred',
            code: this.getErrorCodeFromStatus(status),
          };
        }
      } else {
        errorResponse = {
          message: String(exceptionResponse),
          code: this.getErrorCodeFromStatus(status),
        };
      }
    } else {
      // Unknown exceptions
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      errorResponse = {
        message: 'Internal server error',
        code: ErrorCode.INTERNAL_ERROR,
      };

      // Log unknown exceptions for debugging
      this.logger.error(
        'Unhandled exception',
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    void response.status(status).send(errorResponse);
  }

  /**
   * Maps HTTP status codes to error codes
   */
  private getErrorCodeFromStatus(status: number): ErrorCode {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.BAD_REQUEST;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.CONFLICT:
        return ErrorCode.CONFLICT;
      default:
        return ErrorCode.INTERNAL_ERROR;
    }
  }
}
