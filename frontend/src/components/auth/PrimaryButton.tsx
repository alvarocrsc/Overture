import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import {
  Colors,
  Dimensions,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
} from '@/src/lib/colors';

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  /** 'light' = white bg / dark text (default). 'dark' = dark bg / white text. */
  variant?: 'light' | 'dark';
  /** Override the default full button width (e.g. for Upload button). */
  width?: number;
  /** Override the default button height. */
  height?: number;
}

/**
 * Pill-shaped primary action button used throughout the auth flow.
 * Defaults to the 'light' variant (white background, dark text).
 * Shows an ActivityIndicator when loading and reduces opacity when disabled.
 *
 * @param label - Button label text.
 * @param onPress - Callback fired on press.
 * @param loading - When true replaces label with a spinner.
 * @param disabled - When true reduces opacity and blocks onPress.
 * @param variant - 'light' (default) or 'dark'.
 * @param width - Optional width override.
 * @param height - Optional height override.
 */
export function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'light',
  width,
  height,
}: PrimaryButtonProps): React.JSX.Element {
  const isLight = variant === 'light';

  return (
    <Pressable
      onPress={disabled || loading ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        isLight ? styles.light : styles.dark,
        { width: width ?? Dimensions.buttonWidth, height: height ?? Dimensions.buttonHeight },
        (disabled || loading) && styles.disabled,
        pressed && !(disabled || loading) && styles.pressed,
      ]}
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator color={isLight ? Colors.buttonText : Colors.white} />
      ) : (
        <Text style={[styles.label, isLight ? styles.labelLight : styles.labelDark]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: Radius.button,
    justifyContent: 'center',
    alignItems: 'center',
  },
  light: {
    backgroundColor: Colors.white,
  },
  dark: {
    backgroundColor: Colors.background,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    letterSpacing: LetterSpacing.tight,
  },
  labelLight: {
    color: Colors.buttonText,
  },
  labelDark: {
    color: Colors.white,
  },
});
