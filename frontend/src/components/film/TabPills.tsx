import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';

export type FilmTabKey = 'about' | 'trailer' | 'photos';

interface TabPillsProps {
  active: FilmTabKey;
  onChange: (tab: FilmTabKey) => void;
}

const TABS: { key: FilmTabKey; label: string }[] = [
  { key: 'about', label: 'ABOUT' },
  { key: 'trailer', label: 'TRAILER' },
  { key: 'photos', label: 'PHOTOS' },
];

/**
 * Three-option switcher (About / Trailer / Photos) shown at the top of the
 * film header.
 */
export default function TabPills({
  active,
  onChange,
}: TabPillsProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            hitSlop={8}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}
          >
            <Text style={[styles.label, isActive ? styles.active : styles.inactive]}>
              {tab.label}
            </Text>
            {isActive ? <View style={styles.underline} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
  },
  active: {
    color: Colors.white,
  },
  inactive: {
    color: Colors.textMuted,
  },
  underline: {
    marginTop: 4,
    width: 28,
    height: 2,
    backgroundColor: Colors.white,
    borderRadius: 1,
  },
});
