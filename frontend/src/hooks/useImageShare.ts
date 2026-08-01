import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import * as Haptics from 'expo-haptics';

import { shareTmdbImage } from '@/src/services/image-share.service';

/**
 * Returns a callback that opens the native share sheet for a TMDB image, from
 * which the user can save it to their photo library or send it elsewhere.
 *
 * A haptic tap fires immediately on invocation — this is normally reached by
 * long-pressing an image, so the tap is the confirmation that the gesture
 * registered, and it stands in for a spinner while the image downloads.
 * Repeat invocations are ignored until the current one settles, which is
 * tracked in a ref so no re-render (and no disabled-looking control) results.
 *
 * @returns A `share(tmdbFilePath)` callback with a stable identity.
 */
export function useImageShare(): (tmdbFilePath: string) => void {
  const pendingRef = useRef(false);

  return useCallback((tmdbFilePath: string): void => {
    if (pendingRef.current) return;
    pendingRef.current = true;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
      () => undefined,
    );

    shareTmdbImage(tmdbFilePath)
      .catch(() => {
        Alert.alert('Could not share image', 'Please try again.');
      })
      .finally(() => {
        pendingRef.current = false;
      });
  }, []);
}
