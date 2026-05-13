import React from 'react';
import {
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';
import SectionDivider from './SectionDivider';
import { backdropUrl } from '@/src/lib/tmdb';
import { CARD_GAP, SCREEN_PADDING_H, useLayout } from '@/src/lib/layout';

interface MediaCardProps {
  label: string;
  count: number;
  thisYear?: number;
  backdropPath: string;
  width: number;
  height: number;
  labelFontSize: number;
  onPress?: () => void;
}

interface MediaGridProps {
  films: { count: number; thisYear: number };
  series: { count: number; thisYear: number };
  diary: { count: number; thisYear: number };
  watchlist: number;
  reviews: number;
  lists: number;
  onPressFilms?: () => void;
  onPressSeries?: () => void;
  onPressDiary?: () => void;
  onPressWatchlist?: () => void;
  onPressReviews?: () => void;
  onPressLists?: () => void;
}

const CARD_ASPECT = 100 / 170; // preserve original height/width ratio

// Backdrop paths for each card.
const BG = {
  films: '/3nv2TEz2u178xPXzdKlZdUh5uOI.jpg',
  series: '/1vpmGGDaW4aUGKCfQTV0ygAPtBu.jpg',
  diary: '/jjcrhQRmAujt8YzonA6LQiwNrQG.jpg',
  watchlist: '/vCLILR73xCfjxBlbWpNBqfNop4I.jpg',
  reviews: '/kJF5TZzmobmNF7jlrov53OReZF8.jpg',
  lists: '/msCHK5Kh1YbdZ0zPJ2nzPUhhSN9.jpg',
};

function MediaCard({
  label,
  count,
  thisYear,
  backdropPath,
  width,
  height,
  labelFontSize,
  onPress,
}: MediaCardProps): React.JSX.Element {
  const uri = backdropUrl(backdropPath, 'w780');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { width, height },
        pressed && { opacity: 0.85 },
      ]}
    >
      {uri ? (
        <ImageBackground
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          imageStyle={styles.cardImage}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.cardImageFallback]} />
      )}
      <View style={styles.cardOverlay} pointerEvents="none" />
      <View style={styles.cardContent}>
        <Text
          style={[styles.cardLabel, { fontSize: labelFontSize }]}
          numberOfLines={2}
        >
          {label}
        </Text>
        <View style={styles.cardRight}>
          <Text style={styles.cardCount} numberOfLines={1}>
            {count}
          </Text>
          {thisYear !== undefined ? (
            <>
              <View style={styles.cardDivider} />
              <Text style={styles.cardSubtitle} numberOfLines={1}>
                <Text style={styles.cardSubtitleAccent}>{thisYear} </Text>
                this year
              </Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

/**
 * 2-column 3-row "Your Media" grid with backdrop images. Each card
 * navigates to a different screen when pressed.
 */
export default function MediaGrid({
  films,
  series,
  diary,
  watchlist,
  reviews,
  lists,
  onPressFilms,
  onPressSeries,
  onPressDiary,
  onPressWatchlist,
  onPressReviews,
  onPressLists,
}: MediaGridProps): React.JSX.Element {
  const { gridCardWidth, isSmallScreen, isTinyScreen } = useLayout();
  const cardHeight = Math.round(gridCardWidth * CARD_ASPECT);
  const labelFontSize = isTinyScreen ? 10 : isSmallScreen ? 11 : 13;

  const cardSize = {
    width: gridCardWidth,
    height: cardHeight,
    labelFontSize,
  };

  return (
    <View style={styles.section}>
      <SectionDivider prefix="YOUR" label="MEDIA" />

      <View style={styles.grid}>
        <MediaCard
          label="FILMS"
          count={films.count}
          thisYear={films.thisYear}
          backdropPath={BG.films}
          onPress={onPressFilms}
          {...cardSize}
        />
        <MediaCard
          label="SERIES"
          count={series.count}
          thisYear={series.thisYear}
          backdropPath={BG.series}
          onPress={onPressSeries}
          {...cardSize}
        />
        <MediaCard
          label="DIARY"
          count={diary.count}
          thisYear={diary.thisYear}
          backdropPath={BG.diary}
          onPress={onPressDiary}
          {...cardSize}
        />
        <MediaCard
          label="WATCHLIST"
          count={watchlist}
          backdropPath={BG.watchlist}
          onPress={onPressWatchlist}
          {...cardSize}
        />
        <MediaCard
          label="REVIEWS"
          count={reviews}
          backdropPath={BG.reviews}
          onPress={onPressReviews}
          {...cardSize}
        />
        <MediaCard
          label="LISTS"
          count={lists}
          backdropPath={BG.lists}
          onPress={onPressLists}
          {...cardSize}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    width: '100%',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SCREEN_PADDING_H,
    marginTop: 10,
    rowGap: CARD_GAP,
    columnGap: CARD_GAP,
    justifyContent: 'flex-start',
  },
  card: {
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  cardImage: {
    resizeMode: 'cover',
    opacity: 0.5,
  },
  cardImageFallback: {
    backgroundColor: Colors.cardBackground,
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  cardRight: {
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  cardLabel: {
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
    letterSpacing: -1,
    textAlign: 'center',
  },
  cardCount: {
    fontFamily: FontFamily.extraBold,
    fontSize: 30,
    color: Colors.accentBlue,
    letterSpacing: -1,
    lineHeight: 32,
  },
  cardDivider: {
    height: 1,
    width: '80%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: -1,
    marginBottom: 3,
  },
  cardSubtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  cardSubtitleAccent: {
    fontFamily: FontFamily.extraBold,
    color: Colors.accentBlue,
  },
});
