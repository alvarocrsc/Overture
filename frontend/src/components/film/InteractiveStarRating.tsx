import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { FullStarIcon } from '@/src/components/icons/FullStarIcon';
import { HalfStarIcon } from '@/src/components/icons/HalfStarIcon';
import { Colors } from '@/src/lib/colors';

interface InteractiveStarRatingProps {
  /** Current value in 0.5 increments, 0–5. */
  value: number;
  /** Called when the user taps to change the rating. */
  onChange: (value: number) => void;
  /** Star size in pixels. Defaults to 22. */
  size?: number;
  /** Active star colour. Defaults to accentBlue. */
  color?: string;
  /** Inactive star background. Defaults to a translucent white. */
  emptyColor?: string;
  /** Horizontal gap between stars. Defaults to 4. */
  gap?: number;
}

export default function InteractiveStarRating({
  value,
  onChange,
  size = 22,
  color = Colors.accentBlue,
  emptyColor = 'rgba(255,255,255,0.25)',
  gap = 4,
}: InteractiveStarRatingProps): React.JSX.Element {
  const [pressed, setPressed] = useState<number | null>(null);
  const display = pressed ?? value;

  const handlePress = (half: number): void => {
    const next = half === value ? 0 : half;
    onChange(next);
  };

  return (
    <View style={[styles.row, { gap }]}>
      {[0, 1, 2, 3, 4].map((i) => {
        const starValue = i + 1;
        const fill =
          display >= starValue
            ? 'full'
            : display >= starValue - 0.5
              ? 'half'
              : 'empty';
        return (
          <View key={i} style={{ width: size, height: size }}>
            {/* Visible star */}
            {fill === 'full' ? (
              <FullStarIcon size={size} color={color} />
            ) : fill === 'half' ? (
              <View style={StyleSheet.absoluteFill}>
                <FullStarIcon size={size} color={emptyColor} />
                <View style={StyleSheet.absoluteFill}>
                  <HalfStarIcon size={size} color={color} />
                </View>
              </View>
            ) : (
              <FullStarIcon size={size} color={emptyColor} />
            )}

            {/* Tap targets: two halves */}
            <View style={styles.targets} pointerEvents="box-none">
              <Pressable
                onPressIn={() => setPressed(starValue - 0.5)}
                onPressOut={() => setPressed(null)}
                onPress={() => handlePress(starValue - 0.5)}
                style={styles.halfTarget}
                hitSlop={2}
              />
              <Pressable
                onPressIn={() => setPressed(starValue)}
                onPressOut={() => setPressed(null)}
                onPress={() => handlePress(starValue)}
                style={styles.halfTarget}
                hitSlop={2}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  targets: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  halfTarget: {
    flex: 1,
    height: '100%',
  },
});
