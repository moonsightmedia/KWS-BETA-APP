/**
 * Utility functions for React Query with timeout and error handling
 */

/**
 * Wraps a query function with a timeout
 * @param queryFn The original query function
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 * @returns Wrapped query function with timeout
 */
export const withQueryTimeout = <T,>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 10000
): Promise<T> => {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Query timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([queryFn(), timeoutPromise]);
};

/**
 * Creates a query function with automatic timeout and error handling
 * @param queryFn The original query function
 * @param timeoutMs Timeout in milliseconds (default: 10000)
 * @returns Wrapped query function
 */
export const createQueryWithTimeout = <T,>(
  queryFn: () => Promise<T>,
  timeoutMs: number = 10000
) => {
  return async () => {
    try {
      return await withQueryTimeout(queryFn, timeoutMs);
    } catch (error: any) {
      // Log timeout errors
      if (error?.message?.includes('timeout')) {
        console.error('[QueryUtils] Query timeout:', error.message);
      }
      throw error;
    }
  };
};

