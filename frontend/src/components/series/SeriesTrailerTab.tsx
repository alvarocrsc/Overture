import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';

/**
 * Series trailer tab. The backend currently exposes no trailer endpoint for
 * series, so we render a static empty state with matching visuals to the
 * film trailer tab's empty state.
 */
export default function SeriesTrailerTab(): React.JSX.Element {
  return (
    <View style={styles.empty}>
      <Ionicons name="film-outline" size={48} color={Colors.textMuted} />
      <Text style={styles.emptyText}>No trailer available</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 40,
  },
  emptyText: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
});
