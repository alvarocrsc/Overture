import { Pressable, StyleSheet, Text } from 'react-native';
import {
  Colors,
  Dimensions,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
} from '@/src/lib/colors';

interface SkipButtonProps {
  onPress: () => void;
  /** Optional button label. Defaults to "Skip". */
  label?: string;
}

/**
 * Small rounded-pill skip button displayed in the top-right corner of
 * register steps that allow skipping.
 *
 * @param onPress - Action triggered when the button is pressed.
 * @param label - Optional override for the button text. Defaults to "Skip".
 */
export function SkipButton({ onPress, label = 'Skip' }: SkipButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: Dimensions.skipButtonWidth,
    height: Dimensions.skipButtonHeight,
    backgroundColor: Colors.skipBackground,
    borderRadius: Radius.skip,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
});
