import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { InvisibleInput } from '@/src/components/auth/InvisibleInput';
import { OnboardingScreen } from '@/src/components/auth/OnboardingScreen';
import { useAuth } from '@/src/context/AuthContext';
import { useRegister } from '@/src/context/RegisterContext';
import {
  Colors,
  FontFamily,
  FontSize,
  LetterSpacing,
} from '@/src/lib/colors';

/** Validates username: 3-20 chars, lowercase letters, digits, underscores only. */
const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

/**
 * Register step 3 — username.
 * Calls useAuth().register() to create the account.
 * On success navigates to profile-picture.
 * On API error (e.g. 409 conflict) shows the error in-place without navigating.
 */
export default function RegisterUsernameScreen(): React.JSX.Element {
  const { email, password, username, setUsername } = useRegister();
  const { register } = useAuth();
  const [localUsername, setLocalUsername] = useState(username);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isValid = USERNAME_REGEX.test(localUsername);

  const handleChangeText = (v: string): void => {
    setLocalUsername(v);
    setUsername(v);
    setError(null);
  };

  const handleContinue = async (): Promise<void> => {
    if (!isValid) return;
    setLoading(true);
    setError(null);
    try {
      await register(localUsername, email, password);
      router.push('/register/profile-picture');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingScreen
      currentStep={3}
      totalSteps={5}
      onContinue={handleContinue}
      continueDisabled={!isValid || loading}
      continueLoading={loading}
      hideTopBar
    >
      <Text style={styles.heading}>
        {'Pick a '}
        <Text style={styles.headingAccent}>username</Text>
      </Text>

      <Text style={styles.subtitle}>
        {"You won't be able to change this later, so choose wisely!"}
      </Text>

      <View style={styles.inputWrapper}>
        <InvisibleInput
          value={localUsername}
          onChangeText={handleChangeText}
          placeholder="username"
          prefix="@"
          autoCapitalize="none"
          autoFocus
          maxLength={20}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    paddingHorizontal: 16,
  },
  inputWrapper: {
    marginTop: 32,
    width: '100%',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.caption,
    color: Colors.errorRed,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 8,
  },
});
