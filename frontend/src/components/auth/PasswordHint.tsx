import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
} from '@/src/lib/colors';

interface PasswordHintProps {
  /** Current password value — used to derive the hint message. */
  value: string;
}

type HintState = 'empty' | 'error' | 'success';

function deriveHint(value: string): { message: string; state: HintState } {
  if (value.length === 0) return { message: '', state: 'empty' };
  if (value.length < 8) return { message: 'At least 8 characters', state: 'error' };
  if (!/[A-Z]/.test(value)) return { message: 'Add an uppercase letter', state: 'error' };
  if (!/[a-z]/.test(value)) return { message: 'Add a lowercase letter', state: 'error' };
  if (!/\d/.test(value)) return { message: 'Add a number', state: 'error' };
  return { message: 'Password looks good ✓', state: 'success' };
}

/**
 * Renders a live password requirement hint below the password input.
 * Returns null when the password is empty. Fades in on first appearance
 * and updates the colour to green once all requirements are met.
 *
 * @param value - The current password string.
 */
export function PasswordHint({ value }: PasswordHintProps): React.JSX.Element | null {
  const opacity = useRef(new Animated.Value(0)).current;
  const { message, state } = deriveHint(value);

  useEffect(() => {
    if (state !== 'empty') {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      opacity.setValue(0);
    }
  }, [state, opacity]);

  if (state === 'empty') return null;

  return (
    <Animated.View style={{ opacity }}>
      <Text
        style={[
          styles.hint,
          state === 'success' ? styles.success : styles.error,
        ]}
      >
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  hint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 8,
  },
  error: {
    color: Colors.errorRed,
  },
  success: {
    color: Colors.successGreen,
  },
});
