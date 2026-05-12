import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { OnboardingScreen } from '@/src/components/auth/OnboardingScreen';
import { PrimaryButton } from '@/src/components/auth/PrimaryButton';
import { useRegister } from '@/src/context/RegisterContext';
import { useUploadAvatar } from '@/src/hooks/useUploadAvatar';
import {
  Colors,
  Dimensions,
  FontFamily,
  FontSize,
  LetterSpacing,
  Radius,
} from '@/src/lib/colors';

const NEXT_ROUTE = '/(auth)/register/favorites' as unknown as Href;

/**
 * Register step 4 — profile picture.
 * Allows the user to pick a photo from their library or skip.
 * The user is already authenticated at this point (account was created
 * at the username step), so we upload directly to /users/me/avatar.
 */
export default function RegisterProfilePictureScreen(): React.JSX.Element {
  const { avatarUri, setAvatarUri } = useRegister();
  const [localUri, setLocalUri] = useState<string | null>(avatarUri);
  const { mutateAsync: uploadAvatar, isPending: isUploading } =
    useUploadAvatar();

  const handlePickImage = async (): Promise<void> => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setLocalUri(uri);
      setAvatarUri(uri);
    }
  };

  const handleSkip = (): void => {
    setAvatarUri(null);
    router.push(NEXT_ROUTE);
  };

  const handleContinue = async (): Promise<void> => {
    if (localUri) {
      try {
        await uploadAvatar(localUri);
      } catch {
      }
    }
    router.push(NEXT_ROUTE);
  };

  return (
    <OnboardingScreen
      currentStep={4}
      totalSteps={5}
      onSkip={handleSkip}
      onContinue={() => void handleContinue()}
      continueDisabled={!localUri || isUploading}
      continueLoading={isUploading}
      hideTopBar
    >
      <Text style={styles.heading}>
        {'Upload your '}
        <Text style={styles.headingAccent}>{'\nprofile picture'}</Text>
      </Text>

      <Text style={styles.subtitle}>Show us who's watching.</Text>

      {/* Avatar preview */}
      <Pressable
        onPress={handlePickImage}
        style={styles.avatarWrapper}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Change profile picture"
      >
        {localUri ? (
          <Image source={{ uri: localUri }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarPlaceholderText}>+</Text>
          </View>
        )}
      </Pressable>

      {/* Upload button */}
      <PrimaryButton
        label="Upload photo"
        onPress={handlePickImage}
        variant="dark"
        width={Dimensions.uploadButtonWidth}
        height={Dimensions.uploadButtonHeight}
      />
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
  avatarWrapper: {
    marginTop: 32,
    marginBottom: 20,
  },
  avatar: {
    width: Dimensions.avatarSize,
    height: Dimensions.avatarSize,
    borderRadius: Radius.avatar,
  },
  avatarPlaceholder: {
    backgroundColor: Colors.skipBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    fontFamily: FontFamily.regular,
    fontSize: 40,
    color: Colors.textMuted,
  },
});
