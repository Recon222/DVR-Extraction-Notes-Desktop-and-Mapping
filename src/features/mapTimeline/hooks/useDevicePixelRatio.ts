import { useEffect, useState } from 'react';

interface DPRInfo {
  dpr: number;
  isDPI1x: boolean;
  isDPI1_25x: boolean;
  isDPI1_5x: boolean;
  isDPI2x: boolean;
  dprClass: string;
}

/**
 * Custom hook to detect and monitor device pixel ratio (DPI scaling)
 *
 * Returns DPR information and boolean flags for common DPI scales:
 * - 1.0 = 100% scaling (standard)
 * - 1.25 = 125% scaling
 * - 1.5 = 150% scaling
 * - 2.0+ = 200%+ scaling (high-DPI)
 *
 * The hook also listens for DPI changes (when user changes display scaling).
 */
export const useDevicePixelRatio = (): DPRInfo => {
  const [dpr, setDpr] = useState(window.devicePixelRatio);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const updateDPR = () => {
      // Debounce the update to avoid excessive re-renders
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDpr(window.devicePixelRatio);
      }, 250);
    };

    // Listen for window resize as a proxy for DPI changes
    // Note: Direct DPI change detection is complex, resize is a reasonable approximation
    window.addEventListener('resize', updateDPR);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', updateDPR);
    };
  }, []);

  const isDPI1x = dpr < 1.25;
  const isDPI1_25x = dpr >= 1.25 && dpr < 1.5;
  const isDPI1_5x = dpr >= 1.5 && dpr < 2;
  const isDPI2x = dpr >= 2;

  const dprClass = isDPI2x
    ? 'dpr-2x'
    : isDPI1_5x
    ? 'dpr-1-5x'
    : isDPI1_25x
    ? 'dpr-1-25x'
    : 'dpr-1x';

  return { dpr, isDPI1x, isDPI1_25x, isDPI1_5x, isDPI2x, dprClass };
};
