import React, { useState } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import PosterViewer from '@/src/components/shared/PosterViewer';
import { useImageShare } from '@/src/hooks/useImageShare';
import { LONG_PRESS_DELAY, Radius } from '@/src/lib/colors';
import { originalImageUrl } from '@/src/lib/tmdb';

interface ZoomablePosterProps {
  /** TMDB poster path, or null when the title has no poster. */
  posterPath: string | null;
  /** Placement and size, supplied by the header that positions it. */
  style: StyleProp<ViewStyle>;
}

/**
 * The poster on a title's header, enlarged over a blurred backdrop when tapped.
 *
 * Owns the enlarged view itself so the film and series headers only have to
 * place it, rather than each repeating the open/close state.
 *
 * The thumbnail is loaded at full resolution — the same URL the enlarged view
 * uses — so opening it is instant and pinching in reveals real detail.
 */
export default function ZoomablePoster({
  posterPath,
  style,
}: ZoomablePosterProps): React.JSX.Element | null {
  const [isOpen, setIsOpen] = useState(false);
  const share = useImageShare();

  if (posterPath == null) return null;
  const uri = originalImageUrl(posterPath);
  if (!uri) return null;

  return (
    <>
      <Pressable
        style={({ pressed }) => [style, pressed && styles.pressed]}
        onPress={() => setIsOpen(true)}
        onLongPress={() => share(posterPath)}
        delayLongPress={LONG_PRESS_DELAY}
        accessibilityRole="imagebutton"
        accessibilityLabel="View poster. Long press to share or save."
      >
        {/* Rounded on the image rather than by clipping the pressable, which
            would cut off the drop shadow the header gives it. */}
        <Image source={{ uri }} style={styles.image} contentFit="cover" />
      </Pressable>

      {isOpen ? (
        <PosterViewer
          posterPath={posterPath}
          onClose={() => setIsOpen(false)}
          onLongPress={share}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    height: '100%',
    borderRadius: Radius.poster,
  },
  pressed: {
    opacity: 0.85,
  },
});
