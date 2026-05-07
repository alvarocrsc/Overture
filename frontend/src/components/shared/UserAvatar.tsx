import React from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { CatAvatar } from './CatAvatar';

interface UserAvatarProps {
  /** URL of the user's uploaded profile photo */
  avatarUrl: string | null;
  /** Username — used to generate CatAvatar color when avatarUrl is null */
  username: string;
  /** Rendered size in pixels. Defaults to 40. */
  size?: number;
  /** Optional border color (e.g. accentBlue for active profile tab). */
  borderColor?: string;
  /** Optional border width. Defaults to 0. */
  borderWidth?: number;
}

/**
 * Unified avatar component. Shows the user's photo when available,
 * otherwise renders a CatAvatar with a color derived from the username. Handles the border ring used in the tab bar profile tab.
 *
 * This is the ONLY component in the app that decides between photo and
 * cat fallback — no other component should contain avatar fallback logic.
 *
 * @param avatarUrl - URL of the user's profile photo, or null.
 * @param username - The user's username (used for fallback color).
 * @param size - Rendered size in pixels. Defaults to 40.
 * @param borderColor - Optional border color.
 * @param borderWidth - Optional border width. Defaults to 0.
 */
export function UserAvatar({
  avatarUrl,
  username,
  size = 40,
  borderColor,
  borderWidth = 0,
}: UserAvatarProps): React.JSX.Element {
  const showBorder = borderWidth > 0 && borderColor != null;

  return (
    <View
      style={[
        styles.container,
        { width: size, height: size, borderRadius: size / 2 },
        showBorder && {
          borderWidth,
          borderColor,
          width: size + borderWidth * 2,
          height: size + borderWidth * 2,
          borderRadius: (size + borderWidth * 2) / 2,
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
        />
      ) : (
        <CatAvatar username={username} size={size} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    resizeMode: 'cover',
  },
});
