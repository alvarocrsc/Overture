import React from 'react';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';

interface TagStyle {
  text: string;
  /** Pill background color. */
  bg: string;
  /** Pill text color. */
  color: string;
}

interface Props {
  /** Small uppercase label at the top of the card (e.g. "FILMS LOGGED"). */
  label: string;
  /** Large primary value (e.g. "313", "39,546"). */
  value: string;
  /** TMDB backdrop file_path used as the card background image. */
  backdropPath: string;
  /** Card height. Defaults to 100. Use 65 for the third row. */
  height?: number;
  /** Optional node rendered inline to the right of the value (e.g. star icon). */
  adornment?: React.ReactNode;
  /** Compact variant — smaller value text for the third row of cards. */
  compact?: boolean;
  /** Solid-color pill rendered at the bottom of the card. */
  tag?: TagStyle;
  /** Plain text (no pill) shown at the bottom of the card. */
  footer?: string;
}

/**
 * A single stat card in the overview grid.
 * Label, value, and optional tag/footer are stacked with a 9px gap and
 * centred both horizontally and vertically inside the card — matching Figma.
 */
export default function StatCard({
  label,
  value,
  backdropPath,
  height = 100,
  adornment,
  compact = false,
  tag,
  footer,
}: Props): React.JSX.Element {
  const uri = backdropUrl(backdropPath, 'w780') ?? undefined;

  return (
    <View style={[styles.card, { height }]}>
      <ImageBackground
        source={uri ? { uri } : undefined}
        style={StyleSheet.absoluteFill}
        imageStyle={styles.image}
      />
      <View style={styles.overlay} />

      <View style={styles.content}>
        {/* Label */}
        <Text style={[styles.label]} numberOfLines={1}>
          {label}
        </Text>

        {/* Value + optional inline adornment */}
        <View style={styles.valueRow}>
          <Text style={[styles.value, compact && styles.valueCompact]} numberOfLines={1}>
            {value}
          </Text>
          {adornment}
        </View>

        {/* Pill tag */}
        {tag ? (
          <View style={[styles.tag, { backgroundColor: tag.bg }]}>
            <Text style={[styles.tagText, { color: tag.color }]} numberOfLines={1}>
              {tag.text}
            </Text>
          </View>
        ) : footer ? (
          <Text style={styles.footer}>{footer}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: Colors.cardBackground,
  },
  image: {
    resizeMode: 'cover',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  // ── Centered content column ───────────────────────────────────────────────
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: -4,
  },
  // ── Label ─────────────────────────────────────────────────────────────────
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 11.5,
    color: Colors.white,
    letterSpacing: -1,
    textAlign: 'center',
  },
  // ── Value ─────────────────────────────────────────────────────────────────
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: FontFamily.extraBold,
    fontSize: 30,
    color: Colors.white,
    letterSpacing: -1,
  },
  valueCompact: {
    fontSize: 24,
  },
  // ── Tag pill ─────────────────────────────────────────────────────────────
  tag: {
    height: 14,
    paddingHorizontal: 8,
    borderRadius: 100,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagText: {
    fontFamily: FontFamily.bold,
    fontSize: 8,
    letterSpacing: -0.2,
  },
  // ── Footer plain text ─────────────────────────────────────────────────────
  footer: {
    fontFamily: FontFamily.medium,
    fontSize: 10.5,
    color: '#ffffff',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
});
