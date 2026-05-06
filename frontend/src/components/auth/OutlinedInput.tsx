import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  Dimensions,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
} from '@/src/lib/colors';

interface OutlinedInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  /** When true renders a password-visibility toggle icon on the right. */
  showToggle?: boolean;
  /** Focuses the input after the screen transition settles (400 ms delay). */
  autoFocus?: boolean;
}

/**
 * Bordered input used on the Login screen. Renders a full-width pill
 * with a white 1 px border. When showToggle is true an eye icon toggles
 * the password visibility.
 *
 * @param value - Controlled input value.
 * @param onChangeText - Change handler.
 * @param placeholder - Placeholder label.
 * @param keyboardType - React Native keyboard type.
 * @param autoCapitalize - Capitalisation behaviour.
 * @param secureTextEntry - Whether the input is masked by default.
 * @param showToggle - Renders an eye toggle for password fields.
 */
export function OutlinedInput({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize = 'none',
  secureTextEntry = false,
  showToggle = false,
  autoFocus = false,
}: OutlinedInputProps): React.JSX.Element {
  const [hidden, setHidden] = useState(secureTextEntry);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!autoFocus) return;
    const delay = Keyboard.isVisible() ? 50 : 400;
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, delay);
    return () => clearTimeout(timer);
  }, [autoFocus]);

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={hidden}
        style={[styles.input, showToggle && styles.inputWithToggle]}
        cursorColor={Colors.white}
        selectionColor={Colors.accentBlue}
        returnKeyType="done"
        keyboardAppearance="dark"
      />
      {showToggle && (
        <Pressable
          onPress={() => setHidden((prev) => !prev)}
          style={styles.toggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
        >
          <Ionicons
            name={hidden ? 'eye-off-outline' : 'eye-outline'}
            size={18}
            color={Colors.textMuted}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: Dimensions.buttonWidth,
    height: Dimensions.inputHeight,
    borderRadius: Radius.button,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.body,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  inputWithToggle: {
    paddingRight: 44,
  },
  toggle: {
    position: 'absolute',
    right: 14,
  },
});
