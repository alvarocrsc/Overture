import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, FontSize, Spacing } from '@/src/lib/colors';

interface Props {
  /** Section title text. If titleAccent is provided, that word is rendered in blue. */
  title: string;
  /** Word or phrase within `title` to render in accent blue. */
  titleAccent?: string;
  /** Secondary subtitle text below the title. */
  subtitle?: string;
  /** Word or phrase within `subtitle` to render in accent blue. */
  subtitleAccent?: string;
  /** If provided, renders a right chevron on the right. Not rendered when undefined. */
  onSeeAll?: () => void;
}

/**
 * Section header for Home screen sections. Renders the title with an optional
 * blue accent word, a subtitle, and an optional right-chevron "see all" action.
 * The chevron is vertically centered relative to the combined title+subtitle stack.
 */
export default function SectionHeader({
  title,
  titleAccent,
  subtitle,
  subtitleAccent,
  onSeeAll,
}: Props) {
  function renderText(
    text: string,
    accent: string | undefined,
    baseStyle: object,
    accentStyle: object,
  ): React.ReactNode {
    if (!accent || !text.includes(accent)) {
      return <Text style={baseStyle}>{text}</Text>;
    }
    const parts = text.split(accent);
    return (
      <Text style={baseStyle}>
        {parts[0]}
        <Text style={accentStyle}>{accent}</Text>
        {parts[1]}
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.textStack}>
          {renderText(title, titleAccent, styles.title, styles.titleAccent)}
          {subtitle &&
            renderText(subtitle, subtitleAccent, styles.subtitle, styles.subtitleAccent)}
        </View>
        {onSeeAll && (
          <Pressable onPress={onSeeAll} style={styles.chevronButton} hitSlop={8}>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingLeft: Spacing.screenH,
    paddingRight: Spacing.screenH,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textStack: {
    flex: 1,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 20,
    color: Colors.white,
    letterSpacing: -1,
    lineHeight: 28,
  },
  titleAccent: {
    fontFamily: FontFamily.black,
    color: Colors.accentBlue,
  },
  subtitle: {
    fontFamily: FontFamily.light,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
    marginTop: -2.5,
  },
  subtitleAccent: {
    fontFamily: FontFamily.medium,
    color: Colors.accentBlue,
  },
  chevronButton: {
    paddingLeft: 12,
    paddingVertical: 4,
  },
});
