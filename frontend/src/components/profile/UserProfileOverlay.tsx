import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ProfileView from '@/src/components/profile/ProfileView';
import { BackButton } from '@/src/components/auth/BackButton';
import { useProfile } from '@/src/hooks/useProfile';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';
import { Colors, FontFamily } from '@/src/lib/colors';

export interface UserProfileOverlayProps {
  userId: number;
  /**
   * Triggers the slide-out animation. Wired up by the OverlayHost so the
   * back chevron in the banner plays the same animation as the swipe-back
   * gesture and the tab-bar press.
   */
  onPressBack: () => void;
}

/**
 * Other user's public profile rendered as a presented overlay above the
 * tab navigator. 
 */
export default function UserProfileOverlay({
  userId,
  onPressBack,
}: UserProfileOverlayProps): React.JSX.Element {
  const isValid = Number.isInteger(userId) && userId > 0;
  const profileQuery = useProfile(isValid ? userId : undefined);

  if (!isValid) {
    return <ErrorState message="Invalid user." onPressBack={onPressBack} />;
  }

  if (profileQuery.isLoading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.accentBlue} />
      </View>
    );
  }

  if (profileQuery.isError) {
    return <ErrorState message="User not found." onPressBack={onPressBack} />;
  }

  return (
    <ProfileView
      isOwnProfile={false}
      userId={userId}
      showBackButton
      onPressBack={onPressBack}
    />
  );
}

interface ErrorStateProps {
  message: string;
  onPressBack: () => void;
}

function ErrorState({ message, onPressBack }: ErrorStateProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { dismiss } = useOverlayNavigator();
  return (
    <View style={styles.errorScreen}>
      <View style={[styles.backWrap, { top: insets.top + 12, left: 12 }]}>
        <BackButton onPress={onPressBack} />
      </View>
      <Text style={styles.errorText}>{message}</Text>
      <Pressable
        onPress={() => dismiss()}
        style={({ pressed }) => [styles.goBack, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.goBackLabel}>Go back</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  backWrap: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.white,
    marginBottom: 16,
  },
  goBack: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Colors.white,
  },
  goBackLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.background,
  },
});
