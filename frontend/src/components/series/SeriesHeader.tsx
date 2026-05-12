import React, { useMemo } from 'react';
import {
  ImageBackground,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { SeriesDetail, SeriesImages } from '@/src/types/series.types';
import { backdropUrl, logoUrl, posterUrl } from '@/src/lib/tmdb';
import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import TabPills, { type FilmTabKey } from '@/src/components/film/TabPills';

interface SeriesHeaderProps {
  series: SeriesDetail;
  images: SeriesImages | undefined;
  creator: string | null;
  topInset: number;
  activeTab: FilmTabKey;
  isInWatchlist: boolean;
  onChangeTab: (tab: FilmTabKey) => void;
  onPressLog: () => void;
  onPressWatchlist: () => void;
  onPressMore: () => void;
  onPressBack?: () => void;
}

const HEADER_HEIGHT = 386;

export default function SeriesHeader({
  series,
  images,
  creator,
  topInset,
  activeTab,
  isInWatchlist,
  onChangeTab,
  onPressLog,
  onPressWatchlist,
  onPressMore,
  onPressBack,
}: SeriesHeaderProps): React.JSX.Element {
  const backdropPath = series.custom_backdrop_path ?? series.backdrop_path;
  const posterPath = series.custom_poster_path ?? series.poster_path;
  const backdropUri = backdropUrl(backdropPath, 'w1280');
  const posterUri = posterUrl(posterPath, 'w342');

  const logoPath = useMemo<string | null>(() => {
    const logos = images?.logos ?? [];
    const en = logos.find((l) => l.iso_639_1 === 'en');
    const fallback = en ?? logos[0];
    return fallback ? fallback.file_path : null;
  }, [images]);
  const logoUri = logoUrl(logoPath, 'w500');

  const year = series.first_air_date ? series.first_air_date.slice(0, 4) : null;
  const seasons = series.seasons_count;
  const seasonsLabel =
    seasons != null ? `${seasons} ${seasons === 1 ? 'season' : 'seasons'}` : null;

  const logLabel = series.is_logged ? 'Log again' : 'Log';
  const watchlistLabel = isInWatchlist ? 'Remove' : 'Add to watchlist';

  return (
    <View style={styles.container}>
      {backdropUri ? (
        <ImageBackground source={{ uri: backdropUri }} style={styles.backdrop}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0)', Colors.background]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
        </ImageBackground>
      ) : (
        <View style={[styles.backdrop, styles.backdropFallback]} />
      )}

      <View style={[styles.topRow, { top: topInset + 16 }]}>
        <Pressable
          onPress={onPressBack ?? (() => router.back())}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </Pressable>

        <TabPills active={activeTab} onChange={onChangeTab} />

        <Pressable
          onPress={onPressMore}
          hitSlop={12}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="More options"
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={Colors.white} />
        </Pressable>
      </View>

      {posterUri ? (
        <Image source={{ uri: posterUri }} style={styles.poster} resizeMode="cover" />
      ) : null}

      {logoUri ? (
        <Image source={{ uri: logoUri }} style={styles.logo} resizeMode="contain" />
      ) : (
        <Text style={styles.fallbackTitle} numberOfLines={2}>
          {series.title}
        </Text>
      )}

      <View style={styles.metaRow} pointerEvents="none">
        <Text style={styles.metaText} numberOfLines={1}>
          {year ? `${year}` : ''}
          {year && seasonsLabel ? '  ·  ' : ''}
          {seasonsLabel ?? ''}
          {(year || seasonsLabel) && creator ? '  ·  ' : ''}
          {creator ? (
            <Text style={styles.metaCreator}>
              {`CREATED BY ${creator.toUpperCase()}`}
            </Text>
          ) : null}
        </Text>
      </View>

      <View style={styles.actionRow}>
        <ActionPill
          icon={series.is_logged ? 'refresh-outline' : 'add'}
          label={logLabel}
          onPress={onPressLog}
        />
        <ActionPill
          icon={isInWatchlist ? 'bookmark' : 'bookmark-outline'}
          label={watchlistLabel}
          onPress={onPressWatchlist}
        />
      </View>
    </View>
  );
}

interface ActionPillProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}

function ActionPill({ icon, label, onPress }: ActionPillProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pill, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Ionicons name={icon} size={14} color={Colors.white} />
      <Text style={styles.pillLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: HEADER_HEIGHT,
  },
  backdrop: {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: HEADER_HEIGHT,
    opacity: 0.85,
  },
  backdropFallback: {
    backgroundColor: '#1a1a1a',
  },
  topRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 2,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  poster: {
    position: 'absolute',
    right: 65,
    top: 96,
    width: 90,
    height: 135,
    borderRadius: Radius.poster,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
  },
  logo: {
    position: 'absolute',
    left: 75,
    right: 75,
    bottom: 92,
    height: 56,
  },
  fallbackTitle: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 92,
    fontFamily: FontFamily.black,
    fontSize: 30,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
  },
  metaRow: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 60,
    alignItems: 'center',
  },
  metaText: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  metaCreator: {
    fontFamily: FontFamily.extraBold,
    color: Colors.accentBlue,
  },
  actionRow: {
    position: 'absolute',
    left: 45,
    right: 45,
    bottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  pill: {
    flex: 1,
    height: 35,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  pillLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
});
