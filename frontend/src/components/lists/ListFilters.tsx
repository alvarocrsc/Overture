import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import type { ListViewMode } from '@/src/types/lists.types';

/** Chip / toggle background colour from Figma. */
const CHIP_BG = '#292929';
const CONTENT_WIDTH = 350;

/** The stub filter chips. Each is non-functional for now. */
const FILTER_CHIPS = ['Sort', 'Genre', 'Year', 'More'] as const;

interface ListFiltersProps {
  viewMode: ListViewMode;
  onViewModeToggle: () => void;
}

/**
 * The filter bar shown beneath the header: a scrollable row of filter chips
 * and a right-aligned posters/expanded view toggle.
 *
 * The filter chips are visual stubs only — sorting and filtering are not yet
 * implemented.
 */
export function ListFilters({
  viewMode,
  onViewModeToggle,
}: ListFiltersProps): React.JSX.Element {
  const isPosters = viewMode === 'posters';

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
        style={styles.chips}
      >
        {FILTER_CHIPS.map((label) => (
          <Pressable
            key={label}
            style={styles.chip}
            // TODO(list-filters): wire up sort / filter behaviour.
            onPress={() => undefined}
          >
            <Text style={styles.chipText}>{label}</Text>
            <Ionicons
              name="chevron-down"
              size={11}
              color={Colors.textMuted}
              style={styles.chipChevron}
            />
          </Pressable>
        ))}
      </ScrollView>

      <Pressable
        hitSlop={6}
        onPress={onViewModeToggle}
        style={styles.toggle}
        accessibilityRole="button"
        accessibilityLabel={
          isPosters ? 'Switch to expanded view' : 'Switch to posters view'
        }
      >
        <Ionicons
          name={isPosters ? 'grid' : 'list'}
          size={isPosters ? 18 : 20}
          color={Colors.white}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  chips: {
    flex: 1,
  },
  chipsRow: {
    alignItems: 'center',
    gap: 10,
    paddingRight: 12,
  },
  chip: {
    height: 28,
    borderRadius: 100,
    backgroundColor: CHIP_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  chipText: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  chipChevron: {
    marginLeft: 5,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
