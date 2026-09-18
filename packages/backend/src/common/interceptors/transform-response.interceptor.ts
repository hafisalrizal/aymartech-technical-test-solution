import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';

/**
 * Standard success response structure
 */
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

/**
 * Metadata key for custom response messages
 */
export const RESPONSE_MESSAGE_KEY = 'responseMessage';

/**
 * Metadata key to skip response transformation (e.g., for SSE streams)
 */
export const SKIP_TRANSFORM_KEY = 'skipTransform';

/**
 * Interceptor that wraps all successful responses in a standard structure.
 * Format: { data: T, message?: string }
 */
@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  /**
   * Intercepts the response and wraps it in the standard format
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T> | T> {
    // Check if transformation should be skipped (e.g., for SSE)
    const skipTransform = this.reflector.getAllAndOverride<boolean>(
      SKIP_TRANSFORM_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (skipTransform) {
      return next.handle();
    }

    // Get custom message if set via decorator
    const message = this.reflector.getAllAndOverride<string>(
      RESPONSE_MESSAGE_KEY,
      [context.getHandler(), context.getClass()],
    );

    return next.handle().pipe(
      map((data) => ({
        data,
        ...(message && { message }),
      })),
    );
  }
}
