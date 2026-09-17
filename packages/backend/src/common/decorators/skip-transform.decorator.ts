import { SetMetadata } from '@nestjs/common';
import { SKIP_TRANSFORM_KEY } from '../interceptors/transform-response.interceptor';

/**
 * Decorator to skip response transformation.
 * Use for endpoints that need raw response (e.g., SSE streams).
 *
 * @example
 * ```typescript
 * @Post('chat')
 * @SkipTransform()
 * chat() {
 *   // Returns raw SSE stream, not wrapped in { data }
 * }
 * ```
 */
export const SkipTransform = () => SetMetadata(SKIP_TRANSFORM_KEY, true);
