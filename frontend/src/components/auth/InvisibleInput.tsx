import { useCallback, useRef, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { useFocusEffect, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
} from '@/src/lib/colors';

interface InvisibleInputProps {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  /** Rendered inline before the input, e.g. "@" for username. */
  prefix?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  secureTextEntry?: boolean;
  autoFocus?: boolean;
  maxLength?: number;
}

/**
 * Borderless, backgroundless, centred text input used in the multi-step
 * register flow. Optionally renders a prefix (e.g. "@") inline before
 * the text cursor.
 *
 * @param value - Controlled input value.
 * @param onChangeText - Change handler.
 * @param placeholder - Placeholder text.
 * @param prefix - Optional prefix string rendered before the input.
 * @param keyboardType - React Native keyboard type.
 * @param autoCapitalize - Capitalisation behaviour.
 * @param secureTextEntry - Masks input for password fields.
 * @param autoFocus - Focuses the input on mount.
 * @param maxLength - Maximum character count.
 */
export function InvisibleInput({
  value,
  onChangeText,
  placeholder,
  prefix,
  keyboardType,
  autoCapitalize = 'sentences',
  secureTextEntry = false,
  autoFocus = false,
  maxLength,
}: InvisibleInputProps): React.JSX.Element {
  const inputRef = useRef<TextInput>(null);
  const navigation = useNavigation();
  // Tracks whether the password is currently masked. Starts masked when
  // secureTextEntry is true; toggled by the eye button.
  const [hidden, setHidden] = useState(secureTextEntry);

  useFocusEffect(
    useCallback(() => {
      if (!autoFocus) return;

      // Keyboard already visible — user is navigating between register steps.
      // Immediate focus transfer; iOS treats it as a silent handoff and keeps
      // the keyboard on screen without any hide/show cycle.
      if (Keyboard.isVisible()) {
        inputRef.current?.focus();
        return;
      }

      // First entry (from welcome or login). The email screen is the initial
      // route of the register Stack, which is being pushed by the parent auth
      // Stack. We subscribe to that parent Stack's transitionEnd event, which
      // fires exactly when the native iOS slide animation finishes. Calling
      // focus() at that moment guarantees zero conflict with the animation.
      let unsubscribe: (() => void) | undefined;
      unsubscribe = navigation.getParent()?.addListener(
        'transitionEnd' as never,
        () => {
          inputRef.current?.focus();
          unsubscribe?.(); // one-shot — unsubscribe immediately after firing
        },
      );

      return () => unsubscribe?.();
    }, [autoFocus, navigation]),
  );

  return (
    <View style={styles.row}>
      {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={hidden}
        maxLength={maxLength}
        style={[
          styles.input,
          { color: value.length > 0 ? Colors.white : Colors.textMuted },
        ]}
        cursorColor={Colors.white}
        selectionColor={Colors.accentBlue}
        returnKeyType="done"
        keyboardAppearance="dark"
      />
      {secureTextEntry && (
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
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    position: 'absolute',
    right: 0,
  },
  prefix: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.inputLarge,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.inputLarge,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
  },
});
