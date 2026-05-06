import { Pressable, StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { Colors, FontFamily, FontSize, LetterSpacing } from '@/src/lib/colors';

interface BackButtonProps {
  /** Called when the button is pressed. Defaults to router.back(). */
  onPress?: () => void;
}

/**
 * Chevron-left back navigation button.
 * If no onPress is provided it delegates to router.back().
 *
 * @param onPress - Optional custom back action.
 */
export function BackButton({ onPress }: BackButtonProps): React.JSX.Element {
  const handlePress = (): void => {
    if (onPress) {
      onPress();
    } else {
      // router.back() is always valid — Back button only renders when there
      // is a screen to go back to (inside a Stack navigator).
      router.back();
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessible
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <Text style={styles.chevron}>‹</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  chevron: {
    fontFamily: FontFamily.regular,
    fontSize: 28,
    color: Colors.white,
    lineHeight: 30,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
});
