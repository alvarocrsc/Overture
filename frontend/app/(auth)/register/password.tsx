import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { InvisibleInput } from '@/src/components/auth/InvisibleInput';
import { OnboardingScreen } from '@/src/components/auth/OnboardingScreen';
import { PasswordHint } from '@/src/components/auth/PasswordHint';
import { useRegister } from '@/src/context/RegisterContext';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
} from '@/src/lib/colors';

/** Returns true when the password satisfies all four requirements. */
function isPasswordStrong(value: string): boolean {
  return (
    value.length >= 8 &&
    /[A-Z]/.test(value) &&
    /[a-z]/.test(value) &&
    /\d/.test(value)
  );
}

/**
 * Register step 2 — password.
 * Shows a live PasswordHint below the input. Continue is only enabled
 * once all four strength criteria are met.
 */
export default function RegisterPasswordScreen(): React.JSX.Element {
  const { password, setPassword } = useRegister();
  const [localPassword, setLocalPassword] = useState(password);

  const handleChangeText = (v: string): void => {
    setLocalPassword(v);
    setPassword(v);
  };

  const handleContinue = (): void => {
    router.push('/(auth)/register/username' as unknown as Href);
  };

  return (
    <OnboardingScreen
      currentStep={2}
      totalSteps={5}
      onContinue={handleContinue}
      continueDisabled={!isPasswordStrong(localPassword)}
      hideTopBar
    >
      <Text style={styles.heading}>
        {"Let's create "}
        <Text style={styles.headingAccent}>{'\na password'}</Text>
      </Text>

      <Text style={styles.subtitle}>
        {"Not 'password123'. You're better than that."}
      </Text>

      <View style={styles.inputWrapper}>
        <InvisibleInput
          value={localPassword}
          onChangeText={handleChangeText}
          placeholder="••••••••"
          secureTextEntry
          autoFocus
        />
        <PasswordHint value={localPassword} />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.heading,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
  },
  headingAccent: {
    color: Colors.accentBlue,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.subtitle,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 10,
  },
  inputWrapper: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
});
