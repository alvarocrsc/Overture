import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, Spacing } from '@/src/lib/colors';

export type FilterType = 'media' | 'cast' | 'members' | 'lists' | 'all';

interface FilterOption {
  id: FilterType;
  label: string;
}

const FILTERS: FilterOption[] = [
  { id: 'media', label: 'Media' },
  { id: 'cast', label: 'Cast & Crew' },
  { id: 'members', label: 'Members' },
  { id: 'lists', label: 'Lists' },
  { id: 'all', label: 'All' },
];

interface Props {
  selected: FilterType;
  onSelect: (filter: FilterType) => void;
}

export default function FilterPills({ selected, onSelect }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {FILTERS.map((f) => {
        const isActive = f.id === selected;
        return (
          <Pressable
            key={f.id}
            onPress={() => onSelect(f.id)}
            style={({ pressed }) => [
              styles.pill,
              isActive ? styles.pillActive : styles.pillInactive,
              pressed && !isActive && styles.pressed,
            ]}
            hitSlop={6}
          >
            <Text style={styles.label}>{f.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: Spacing.screenH,
    gap: 8,
    alignItems: 'center',
  },
  pill: {
    height: 27,
    borderRadius: 25,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: 'rgba(26,119,218,0.8)',
  },
  pillInactive: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: -0.5,
  },
});
