/**
 * STUB: Lightweight placeholder for Tauri v1.5 app's useDebounce hook.
 * Will be replaced when shared hooks are fully ported.
 * Created to unblock mapTimeline feature compilation.
 *
 * Consumed by:
 * - mapTimeline/hooks/useVideoPreloader.ts
 */

import { useState, useEffect } from 'react';

/**
 * Debounce a value by the specified delay.
 * Returns the debounced value that only updates after the delay has elapsed
 * since the last change to the input value.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}
