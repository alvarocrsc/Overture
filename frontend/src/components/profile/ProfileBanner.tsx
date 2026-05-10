import React from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily } from '@/src/lib/colors';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { BackButton } from '@/src/components/auth/BackButton';
import { backdropUrl } from '@/src/lib/tmdb';
import type { UserProfile } from '@/src/types/profile.types';

interface ProfileBannerProps {
  profile: UserProfile;
  isOwnProfile: boolean;
  isFollowing?: boolean;
  isFollowPending?: boolean;
  showBackButton?: boolean;
  onPressBack?: () => void;
  onPressFollow?: () => void;
  onPressShare?: () => void;
  onPressSettings?: () => void;
  onPressFollowers?: () => void;
  onPressFollowing?: () => void;
}

const BANNER_HEIGHT = 160;
const AVATAR_SIZE = 100;

/**
 * Top section of the Profile screen — backdrop image, centered avatar,
 * left-aligned name/username/location block, and a horizontally-centered
 * Followers / Following row sitting just below the avatar.
 */
export default function ProfileBanner({
  profile,
  isOwnProfile,
  isFollowing = false,
  isFollowPending = false,
  showBackButton = false,
  onPressBack,
  onPressFollow,
  onPressShare,
  onPressSettings,
  onPressFollowers,
  onPressFollowing,
}: ProfileBannerProps): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const backdrop = backdropUrl(profile.profile_backdrop_path, 'w780');

  return (
    <View style={[styles.banner, { height: BANNER_HEIGHT + insets.top }]}>
      {backdrop ? (
        <ImageBackground
          source={{ uri: backdrop }}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.backdropImage}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.backdropFallback]} />
      )}

      <View pointerEvents="none" style={styles.fade} />

      {showBackButton ? (
        <View style={[{ top: insets.top + -4, left: 12 }]}>
          <BackButton {...(onPressBack ? { onPress: onPressBack } : {})} />
        </View>
      ) : null}

      <View style={[styles.topRight, { top: insets.top + 27, right: 20 }]}>
        {isOwnProfile ? (
          <>
            <Pressable
              hitSlop={10}
              onPress={onPressShare}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="share-outline" size={22} color={Colors.white} />
            </Pressable>
            <Pressable
              hitSlop={10}
              onPress={onPressSettings}
              style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
            >
              <Ionicons name="settings-outline" size={22} color={Colors.white} />
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={onPressFollow}
            disabled={isFollowPending}
            style={({ pressed }) => [
              styles.followButton,
              isFollowing && styles.followButtonActive,
              pressed && styles.pressed,
            ]}
          >
            <Text
              style={[
                styles.followButtonText,
                isFollowing && styles.followButtonTextActive,
              ]}
            >
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.avatarWrap, { top: insets.top + 5 }]}>
        <UserAvatar
          avatarUrl={profile.avatar_url}
          username={profile.username}
          size={AVATAR_SIZE}
        />
      </View>

      {/* Left column: name, @username, location */}
      <View style={[styles.leftColumn, { top: insets.top + 27 }]}>
        {(() => {
          const displayName = profile.name || profile.username;
          const nameFontSize = displayName.length > 8 ? 22 : 28;
          return (
            <Text style={[styles.name, { fontSize: nameFontSize }]} numberOfLines={1}>
              {displayName}
            </Text>
          );
        })()}
        <Text style={styles.username} numberOfLines={1}>
          @{profile.username}
        </Text>
        {profile.location ? (
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>
              <Ionicons name="location-outline" size={12} color={Colors.white} />
            </Text>
            <Text style={styles.location} numberOfLines={1}>
              {profile.location}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Followers / Following row */}
      <View style={[styles.statsRow, { top: insets.top + 115 }]}>
        <Pressable onPress={onPressFollowers} style={styles.statColumn} hitSlop={6}>
          <Text style={styles.statNumber}>{profile.followers_count}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </Pressable>
        <Pressable onPress={onPressFollowing} style={styles.statColumn} hitSlop={6}>
          <Text style={styles.statNumber}>{profile.following_count}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    width: '100%',
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  backdropImage: {
    opacity: 0.3,
    resizeMode: 'cover',
  },
  backdropFallback: {
    backgroundColor: '#1f1f1f',
  },
  fade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pressed: {
    opacity: 0.7,
  },
  backButtonWrap: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  topRight: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    zIndex: 2,
  },
  iconButton: {
    padding: 4,
  },
  followButton: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 100,
    backgroundColor: Colors.accentBlue,
  },
  followButtonActive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.white,
  },
  followButtonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  followButtonTextActive: {
    color: Colors.white,
  },
  avatarWrap: {
    position: 'absolute',
    left: '50%',
    marginLeft: -AVATAR_SIZE / 2,
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  leftColumn: {
    position: 'absolute',
    left: 20,
    maxWidth: '50%',
  },
  name: {
    fontFamily: FontFamily.black,
    fontSize: 28,
    color: Colors.white,
    letterSpacing: -2,
    lineHeight: 32,
  },
  username: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.accentBlue,
    letterSpacing: -1,
    lineHeight: 14,
  },
  locationRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  locationIcon: {
    fontSize: 12,
    lineHeight: 14,
    includeFontPadding: false,
  },
  location: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: -1,
    lineHeight: 12,
  },
  statsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-start',
    gap: 15,
  },
  statColumn: {
    alignItems: 'center',
    minWidth: 70,
  },
  statNumber: {
    fontFamily: FontFamily.bold,
    fontSize: 13,
    color: Colors.accentBlue,
    letterSpacing: -1,
    lineHeight: 15,
  },
  statLabel: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: -1,
    lineHeight: 15,
  },
});
