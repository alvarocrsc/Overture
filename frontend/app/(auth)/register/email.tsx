import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import { z } from 'zod';
import { InvisibleInput } from '@/src/components/auth/InvisibleInput';
import { OnboardingScreen } from '@/src/components/auth/OnboardingScreen';
import { useRegister } from '@/src/context/RegisterContext';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
} from '@/src/lib/colors';

const emailSchema = z.string().email();

/**
 * Register step 1 — email address.
 * Validates the entered email with zod before enabling the Continue button.
 */
export default function RegisterEmailScreen(): React.JSX.Element {
  const { email, setEmail } = useRegister();
  const [localEmail, setLocalEmail] = useState(email);

  const isValid = emailSchema.safeParse(localEmail).success;

  const handleChangeText = (v: string): void => {
    setLocalEmail(v);
    setEmail(v);
  };

  const handleContinue = (): void => {
    // Navigate to next step. Route will exist once password.tsx is created.
    router.push('/(auth)/register/password' as unknown as Href);
  };

  return (
    <OnboardingScreen
      currentStep={1}
      totalSteps={5}
      onContinue={handleContinue}
      continueDisabled={!isValid}
      hideTopBar
    >
      <Text style={styles.heading}>
        {'What is your '}
        <Text style={styles.headingAccent}>email</Text>
        {'?'}
      </Text>

      <Text style={styles.subtitle}>The one you actually check.</Text>

      <View style={styles.inputWrapper}>
        <InvisibleInput
          value={localEmail}
          onChangeText={handleChangeText}
          placeholder="name@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoFocus
        />
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
