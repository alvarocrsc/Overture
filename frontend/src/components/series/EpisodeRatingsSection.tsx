import React, { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '@/src/context/AuthContext';
import { useEpisodeRatingsGrid, useSeasonSummaries } from '@/src/hooks/use-episode-ratings';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { stillUrl } from '@/src/lib/tmdb';
import {
  formatRatingValue,
  getRatingTier,
  RATING_EMPTY_COLOR,
} from '@/src/utils/episode-rating-color.utils';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import type {
  CurrentEpisodePointer,
  GridCell,
  RatingSource,
  SeasonSummary,
} from '@/src/types/episode-ratings.types';

const OVERTURE_LOGO = require('@/assets/images/overture-logo.png');

/** Horizontal screen padding, matching the rest of the series screen. */
const SCREEN_PADDING = 20;
/** Gap between heatmap cells on both axes (Figma: 34.9 pitch on a 32 cell). */
const CELL_GAP = 3;
/** Cell size in the collapsed season row and the full expanded grid (Figma). */
const MAX_CELL_SIZE = 32;
/** Cell size ceiling in compact mode, so more of the grid fits on screen. */
const MAX_COMPACT_CELL_SIZE = 18;
/** Gutter reserved for the episode-number labels down the left of the grid. */
const ROW_LABEL_WIDTH = 18;
/** Cell corner radius (Figma). */
const CELL_RADIUS = 5;

const SWITCH_WIDTH = 85;
const SWITCH_HEIGHT = 35;
const SWITCH_OPTION_WIDTH = 39;
const SWITCH_INSET = 3;

const EXPAND_DURATION = 220;

interface EpisodeRatingsSectionProps {
  tmdbId: number;
  /** Whose ratings to show. Shared with the seasons carousel. */
  source: RatingSource;
  onSourceChange: (source: RatingSource) => void;
  /** Fired when any episode cell is tapped in an expanded state. */
  onEpisodeCellPress: (seasonNumber: number, episodeNumber: number) => void;
}

/**
 * The "Episode Ratings" heatmap on the series screen.
 *
 * Has three states, all animated rather than jumping:
 * - **Collapsed** — one cell per season, showing that season's average.
 * - **Expanded** — the full grid, one cell per episode: seasons across,
 *   episode numbers down.
 * - **Expanded compact** — the same grid at a smaller cell size, so a long
 *   running show fits on screen without scrolling.
 *
 * The grid grows with the content rather than scrolling internally: it sits
 * inside the series screen's own scroll view, and nesting a second vertical
 * scroller inside that would fight it for the gesture. Compact mode is what
 * makes a 25-episode, 10-season show manageable.
 */
export default function EpisodeRatingsSection({
  tmdbId,
  source,
  onSourceChange,
  onEpisodeCellPress,
}: EpisodeRatingsSectionProps): React.JSX.Element | null {
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();

  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isCompact, setIsCompact] = useState<boolean>(false);

  const seasonsQ = useSeasonSummaries(tmdbId, source);
  const gridQ = useEpisodeRatingsGrid(tmdbId, source);

  const seasons = useMemo<SeasonSummary[]>(() => seasonsQ.data ?? [], [seasonsQ.data]);

  /** Fast lookup for the sparse cell payload, keyed "season:episode". */
  const cellsByKey = useMemo<Map<string, GridCell>>(() => {
    const map = new Map<string, GridCell>();
    for (const cell of gridQ.data?.cells ?? []) {
      map.set(`${cell.season_number}:${cell.episode_number}`, cell);
    }
    return map;
  }, [gridQ.data]);

  const contentWidth = screenWidth - SCREEN_PADDING * 2;

  /** Cell size for the collapsed row: one cell per season, capped at the Figma size. */
  const collapsedCellSize = useMemo(() => {
    if (seasons.length === 0) return MAX_CELL_SIZE;
    const available = contentWidth - CELL_GAP * (seasons.length - 1);
    return Math.min(MAX_CELL_SIZE, Math.floor(available / seasons.length));
  }, [contentWidth, seasons.length]);

  /**
   * Cell size for the expanded grid. Columns share the width left after the
   * episode-number gutter, capped so a show with two seasons does not render
   * absurdly wide cells.
   */
  const expandedCellSize = useMemo(() => {
    if (seasons.length === 0) return MAX_CELL_SIZE;
    const available =
      contentWidth - ROW_LABEL_WIDTH - CELL_GAP * (seasons.length - 1);
    const cap = isCompact ? MAX_COMPACT_CELL_SIZE : MAX_CELL_SIZE;
    return Math.max(8, Math.min(cap, Math.floor(available / seasons.length)));
  }, [contentWidth, seasons.length, isCompact]);

  /** Tallest season decides how many rows the grid has. */
  const maxEpisodes = useMemo(
    () => seasons.reduce((max, s) => Math.max(max, s.episode_count), 0),
    [seasons],
  );

  // The progress marker is personal, so it has no meaning in app-average mode.
  const currentEpisode =
    source === 'user' ? (gridQ.data?.currentEpisode ?? null) : null;

  if (seasonsQ.isLoading || seasons.length === 0) return null;

  return (
    <Animated.View style={styles.container} layout={LinearTransition}>
      <View style={styles.header}>
        <SourceSwitch
          source={source}
          onChange={onSourceChange}
          avatarUrl={user?.avatar_url ?? null}
          username={user?.username ?? ''}
          disabled={!user}
        />

        <Pressable
          style={styles.titleBlock}
          onPress={() => setIsExpanded((v) => !v)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityState={{ expanded: isExpanded }}
          accessibilityLabel="Toggle episode ratings grid"
        >
          <View style={styles.titleRow}>
            <Text style={styles.titleAccent}>EPISODE</Text>
            <Ionicons
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              size={12}
              color={Colors.accentBlue}
              style={styles.titleChevron}
            />
          </View>
          <Text style={styles.titleSub}>Ratings</Text>
        </Pressable>

        {isExpanded ? (
          <Animated.View entering={FadeIn.duration(EXPAND_DURATION)} exiting={FadeOut}>
            <Pressable
              onPress={() => setIsCompact((v) => !v)}
              hitSlop={10}
              style={({ pressed }) => [styles.densityButton, pressed && styles.pressed]}
              accessibilityRole="button"
              accessibilityLabel={isCompact ? 'Show larger cells' : 'Show compact grid'}
            >
              <Ionicons
                name={isCompact ? 'scan-outline' : 'contract-outline'}
                size={18}
                color={Colors.white}
              />
            </Pressable>
          </Animated.View>
        ) : (
          <View style={styles.densityButton} />
        )}
      </View>

      {isExpanded ? (
        <Animated.View
          entering={FadeIn.duration(EXPAND_DURATION)}
          exiting={FadeOut.duration(EXPAND_DURATION)}
          layout={LinearTransition}
        >
          <ExpandedGrid
            seasons={seasons}
            maxEpisodes={maxEpisodes}
            cellSize={expandedCellSize}
            cellsByKey={cellsByKey}
            currentEpisode={currentEpisode}
            onCellPress={onEpisodeCellPress}
          />
        </Animated.View>
      ) : (
        <Animated.View
          entering={FadeIn.duration(EXPAND_DURATION)}
          exiting={FadeOut.duration(EXPAND_DURATION)}
          layout={LinearTransition}
        >
          <CollapsedSeasonRow seasons={seasons} cellSize={collapsedCellSize} />
        </Animated.View>
      )}
    </Animated.View>
  );
}

interface SourceSwitchProps {
  source: RatingSource;
  onChange: (source: RatingSource) => void;
  avatarUrl: string | null;
  username: string;
  /** Signed-out users only ever see app-wide averages. */
  disabled: boolean;
}

/**
 * Two-position switch choosing between the user's own ratings and the
 * app-wide average. The selected pill slides rather than cutting across.
 */
function SourceSwitch({
  source,
  onChange,
  avatarUrl,
  username,
  disabled,
}: SourceSwitchProps): React.JSX.Element {
  const offset = useSharedValue(source === 'user' ? 0 : 1);
  offset.value = withTiming(source === 'user' ? 0 : 1, { duration: 180 });

  const pillStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          offset.value * (SWITCH_WIDTH - SWITCH_OPTION_WIDTH - SWITCH_INSET * 2),
      },
    ],
  }));

  return (
    <View style={styles.switch}>
      <Animated.View style={[styles.switchPill, pillStyle]} />

      <Pressable
        style={styles.switchOption}
        onPress={() => onChange('user')}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ selected: source === 'user' }}
        accessibilityLabel="Show my ratings"
      >
        <UserAvatar avatarUrl={avatarUrl} username={username} size={25} />
      </Pressable>

      <Pressable
        style={styles.switchOption}
        onPress={() => onChange('app')}
        accessibilityRole="button"
        accessibilityState={{ selected: source === 'app' }}
        accessibilityLabel="Show Overture average ratings"
      >
        <Image source={OVERTURE_LOGO} style={styles.switchLogo} resizeMode="contain" />
      </Pressable>
    </View>
  );
}

interface CollapsedSeasonRowProps {
  seasons: SeasonSummary[];
  cellSize: number;
}

/** One cell per season, showing that season's average rating. */
function CollapsedSeasonRow({
  seasons,
  cellSize,
}: CollapsedSeasonRowProps): React.JSX.Element {
  return (
    <View>
      <View style={styles.seasonLabelRow}>
        {seasons.map((season) => (
          <View key={season.season_number} style={{ width: cellSize }}>
            <Text style={styles.seasonLabel} numberOfLines={1}>
              {`S${season.season_number}`}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.cellRow}>
        {seasons.map((season) => {
          const tier = getRatingTier(season.avg_rating);
          return (
            <View
              key={season.season_number}
              style={[
                styles.cell,
                {
                  width: cellSize,
                  height: cellSize,
                  backgroundColor: tier?.color ?? RATING_EMPTY_COLOR,
                },
              ]}
            >
              {season.avg_rating !== null && tier ? (
                <Text style={[styles.cellValue, { color: tier.textColor }]}>
                  {formatRatingValue(season.avg_rating)}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface ExpandedGridProps {
  seasons: SeasonSummary[];
  maxEpisodes: number;
  cellSize: number;
  cellsByKey: Map<string, GridCell>;
  currentEpisode: CurrentEpisodePointer | null;
  onCellPress: (seasonNumber: number, episodeNumber: number) => void;
}

/** The full heatmap: seasons across the top, episode numbers down the side. */
function ExpandedGrid({
  seasons,
  maxEpisodes,
  cellSize,
  cellsByKey,
  currentEpisode,
  onCellPress,
}: ExpandedGridProps): React.JSX.Element {
  const rows = Array.from({ length: maxEpisodes }, (_, i) => i + 1);
  const showValues = cellSize >= MAX_COMPACT_CELL_SIZE + 6;

  return (
    <View>
      <View style={styles.gridHeaderRow}>
        <View style={styles.rowLabelSpacer} />
        {seasons.map((season) => (
          <View key={season.season_number} style={{ width: cellSize }}>
            <Text style={styles.seasonLabel} numberOfLines={1}>
              {`S${season.season_number}`}
            </Text>
          </View>
        ))}
      </View>

      {rows.map((episodeNumber) => (
        <View key={episodeNumber} style={styles.gridRow}>
          <View style={styles.rowLabelSpacer}>
            <Text style={styles.rowLabel} numberOfLines={1}>
              {episodeNumber}
            </Text>
          </View>

          {seasons.map((season) => {
            // Seasons are uneven, so a row can run past a short season's end.
            if (episodeNumber > season.episode_count) {
              return (
                <View
                  key={season.season_number}
                  style={{ width: cellSize, height: cellSize }}
                />
              );
            }

            const cell = cellsByKey.get(`${season.season_number}:${episodeNumber}`);
            const tier = getRatingTier(cell?.value ?? null);
            const isCurrent =
              currentEpisode !== null &&
              currentEpisode.season_number === season.season_number &&
              currentEpisode.episode_number === episodeNumber;

            return (
              <Pressable
                key={season.season_number}
                onPress={() => onCellPress(season.season_number, episodeNumber)}
                style={({ pressed }) => [
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: tier?.color ?? RATING_EMPTY_COLOR,
                  },
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Season ${season.season_number} episode ${episodeNumber}`}
              >
                {isCurrent ? (
                  <>
                    {currentEpisode.still_path ? (
                      <ExpoImage
                        source={{
                          uri: stillUrl(currentEpisode.still_path, 'w185') ?? undefined,
                        }}
                        style={StyleSheet.absoluteFill}
                        contentFit="cover"
                        transition={150}
                      />
                    ) : null}
                    <View style={styles.currentDot} />
                  </>
                ) : cell && tier && showValues ? (
                  <Text style={[styles.cellValue, { color: tier.textColor }]}>
                    {formatRatingValue(cell.value)}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: SCREEN_PADDING,
    marginTop: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  titleBlock: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleAccent: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
  },
  titleChevron: {
    marginLeft: 6,
  },
  titleSub: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  densityButton: {
    width: SWITCH_WIDTH,
    alignItems: 'flex-end',
  },
  switch: {
    width: SWITCH_WIDTH,
    height: SWITCH_HEIGHT,
    borderRadius: 7,
    backgroundColor: '#1b1b1b',
    flexDirection: 'row',
    alignItems: 'center',
    padding: SWITCH_INSET,
  },
  switchPill: {
    position: 'absolute',
    left: SWITCH_INSET,
    top: SWITCH_INSET,
    width: SWITCH_OPTION_WIDTH,
    height: SWITCH_HEIGHT - SWITCH_INSET * 2,
    borderRadius: 7,
    backgroundColor: '#373737',
  },
  switchOption: {
    width: SWITCH_OPTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchLogo: {
    width: 25,
    height: 25,
  },
  seasonLabelRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: 4,
  },
  seasonLabel: {
    fontFamily: FontFamily.light,
    fontSize: 10,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
  },
  cellRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  gridHeaderRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: 4,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  rowLabelSpacer: {
    width: ROW_LABEL_WIDTH,
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: FontFamily.light,
    fontSize: 9,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
  },
  cell: {
    borderRadius: CELL_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cellValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
  },
  currentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentBlue,
  },
  pressed: {
    opacity: 0.7,
  },
});
