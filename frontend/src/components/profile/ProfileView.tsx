import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  Colors,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';

import ProfileBanner from '@/src/components/profile/ProfileBanner';
import FavoritesRow from '@/src/components/profile/FavoritesRow';
import FavoritesEditorDrawer from '@/src/components/profile/FavoritesEditorDrawer';
import RecentActivityRow from '@/src/components/profile/RecentActivityRow';
import RatingDistributionChart from '@/src/components/profile/RatingDistributionChart';
import MediaGrid from '@/src/components/profile/MediaGrid';

import { useFollowActions } from '@/src/hooks/useFollowActions';
import { useProfile, useMyProfile } from '@/src/hooks/useProfile';
import { useUserFavorites } from '@/src/hooks/useUserFavorites';
import { useRecentActivity } from '@/src/hooks/useRecentActivity';
import { useRatingDistribution } from '@/src/hooks/useRatingDistribution';
import {
  useUpdateFavorites,
  type FavoriteInput,
} from '@/src/hooks/useUpdateFavorites';
import { useUploadAvatar } from '@/src/hooks/useUploadAvatar';
import { useAuth } from '@/src/context/AuthContext';
import { useOverlayNavigator } from '@/src/context/OverlayNavigatorContext';

import type { UserProfile, UserFavorite } from '@/src/types/profile.types';
import type { FilmResult } from '@/src/hooks/useFilms';

interface ProfileViewProps {
  isOwnProfile: boolean;
  userId?: number;
  showBackButton?: boolean;
  onPressBack?: () => void;
}

/**
 * Single shared composition that drives both `(tabs)/profile.tsx`
 * (own profile) and `user/[id].tsx` (other user). Decides which
 * profile hook to call based on `isOwnProfile` and toggles ownership-
 * dependent UI (settings vs follow button, "+" empty favorite slots).
 */
export default function ProfileView({
  isOwnProfile,
  userId,
  showBackButton = false,
  onPressBack,
}: ProfileViewProps): React.JSX.Element {
  const { user } = useAuth();
  const myProfileQuery = useMyProfile();
  const otherProfileQuery = useProfile(userId);
  const profileQuery = isOwnProfile ? myProfileQuery : otherProfileQuery;

  const profile: UserProfile | undefined = profileQuery.data;
  const profileId = profile?.id;

  const viewingSelf = isOwnProfile || (user != null && profileId === user.id);

  const favoritesQuery = useUserFavorites(viewingSelf ? undefined : profileId);
  const recentQuery = useRecentActivity(profileId);
  const distributionQuery = useRatingDistribution(
    viewingSelf ? undefined : profileId,
  );
  const { mutate: updateFavorites } = useUpdateFavorites();
  const { mutate: uploadAvatar, isPending: isUploadingAvatar } =
    useUploadAvatar();

  const followActions = useFollowActions(
    userId ?? -1,
    profile?.is_following ?? false,
  );

  const overlay = useOverlayNavigator();
  const navigateToDetail = (
    detail:
      | { kind: 'review'; id: number }
      | { kind: 'film'; tmdbId: number }
      | { kind: 'series'; tmdbId: number },
  ): void => {
    if (viewingSelf) {
      if (detail.kind === 'review') {
        router.push({
          pathname: '/review/[id]',
          params: { id: String(detail.id) },
        });
      } else {
        router.push({
          pathname:
            detail.kind === 'film' ? '/film/[tmdbId]' : '/series/[tmdbId]',
          params: { tmdbId: String(detail.tmdbId) },
        } as never);
      }
      return;
    }
    if (detail.kind === 'review') {
      overlay.present('review', { id: detail.id });
    } else {
      overlay.present(detail.kind, { id: detail.tmdbId });
    }
  };

  const [drawerVisible, setDrawerVisible] = useState(false);
  const [targetPosition, setTargetPosition] = useState<number>(1);

  /** Convert cached UserFavorite rows to the shape the backend expects. */
  const toFavoriteInputs = (favs: UserFavorite[]): FavoriteInput[] =>
    favs.map((f) => ({
      position: f.position,
      tmdb_id: f.tmdb_id,
      media_type: f.media_type,
    }));

  const handleSlotPress = (position: number): void => {
    setTargetPosition(position);
    setDrawerVisible(true);
  };

  const handleFilmSelected = (film: FilmResult, position: number): void => {
    const current = favoritesQuery.data ?? [];
    const others = toFavoriteInputs(current).filter(
      (f) => f.position !== position && f.tmdb_id !== film.tmdb_id,
    );
    const updated: FavoriteInput[] = [
      ...others,
      { position: position as 1 | 2 | 3 | 4, tmdb_id: film.tmdb_id, media_type: 'film' },
    ];
    updateFavorites(updated);
  };

  const handleRemoveFavorite = (position: number): void => {
    const current = favoritesQuery.data ?? [];
    const updated = toFavoriteInputs(current).filter(
      (f) => f.position !== position,
    );
    updateFavorites(updated);
  };

  /**
   * Opens the photo library so the user can pick + crop a square image,
   * then uploads it to the backend. Only invoked for the signed-in user's
   * own profile (the banner only wires this when `isOwnProfile` is true).
   */
  const handleAvatarPress = async (): Promise<void> => {
    const { status } =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow access to your photo library to change your profile picture.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    uploadAvatar(result.assets[0].uri);
  };

  const favorites = favoritesQuery.data ?? [];
  const recentItems = recentQuery.data ?? [];
  const hasFavorites = favorites.length > 0;
  const hasActivity = recentItems.length > 0;

  if (!profile) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator color={Colors.accentBlue} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 50,
          },
        ]}
      >
        <ProfileBanner
          profile={profile}
          isOwnProfile={viewingSelf}
          showBackButton={showBackButton}
          isFollowing={followActions.isFollowing}
          isFollowPending={followActions.isPending}
          onPressFollow={() => void followActions.toggle()}
          {...(viewingSelf
            ? {
                onAvatarPress: () => void handleAvatarPress(),
                isAvatarUploading: isUploadingAvatar,
                onPressSettings: () => router.push('/settings'),
              }
            : {})}
          {...(onPressBack ? { onPressBack } : {})}
        />

        <View style={styles.gap10} />
        {(hasFavorites || viewingSelf) && (
          <FavoritesRow
            favorites={favorites}
            isOwnProfile={viewingSelf}
            onSlotPress={handleSlotPress}
            onRemovePress={handleRemoveFavorite}
          />
        )}

        {hasActivity && (
          <>
            <View style={styles.gap12} />
            <RecentActivityRow
              items={recentItems}
              onPressItem={(item) => {
                if (item.review_id != null) {
                  navigateToDetail({ kind: 'review', id: item.review_id });
                  return;
                }
                navigateToDetail(
                  item.media_type === 'film'
                    ? { kind: 'film', tmdbId: item.tmdb_id }
                    : { kind: 'series', tmdbId: item.tmdb_id },
                );
              }}
            />
          </>
        )}

        <View style={styles.gap10} />
        {(distributionQuery.data ?? []).length > 0 && (
          <>
            <RatingDistributionChart
              distribution={distributionQuery.data ?? []}
            />
            <View style={styles.gap10} />
          </>
        )}
        <MediaGrid
          films={{ count: profile.films_count, thisYear: profile.films_this_year }}
          series={{ count: profile.series_count, thisYear: profile.series_this_year }}
          diary={{ count: profile.diary_count, thisYear: profile.diary_this_year }}
          watchlist={profile.watchlist_count}
          reviews={profile.reviews_count}
          lists={profile.lists_count}
          onPressFilms={() => router.push('/(tabs)/stats')}
          onPressSeries={() => router.push('/(tabs)/stats')}
          onPressDiary={() => router.push('/(tabs)/stats')}
          onPressWatchlist={() => router.push('/(tabs)/stats')}
          onPressReviews={() => router.push('/(tabs)/stats')}
          onPressLists={() => {
            if (profileId != null) {
              router.push({
                pathname: '/user-lists/[userId]',
                params: { userId: String(profileId) },
              });
            }
          }}
        />
      </ScrollView>

      {viewingSelf ? (
        <FavoritesEditorDrawer
          visible={drawerVisible}
          targetPosition={targetPosition}
          onClose={() => setDrawerVisible(false)}
          onFilmSelected={handleFilmSelected}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingScreen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 1,
  },
  gap10: { height: 10 },
  gap12: { height: 10 },
});
