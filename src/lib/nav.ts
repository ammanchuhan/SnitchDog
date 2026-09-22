import { useRouter } from 'expo-router';
import { useCallback } from 'react';

/** Back, or home if there's nothing to go back to.
 *
 * A modal can be the first screen in the stack — after a reload, or when a deep link opens it —
 * and plain router.back() dead-ends there with nothing but a warning. */
export function useDismiss() {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/today');
  }, [router]);
}
