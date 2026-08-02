import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import type { RatingFormat } from '@/src/types/profile.types';

const OPTIONS: { value: RatingFormat; label: string }[] = [
  { value: 'stars', label: '★ 0–5' },
  { value: 'numeric', label: '0.0–10' },
];

interface RatingFormatRowProps {
  label: string;
  value: RatingFormat;
  disabled?: boolean;
  onChange: (next: RatingFormat) => void;
}

/**
 * Settings row with a two-option segmented control choosing the scale ratings
 * are shown in for one media type.
 *
 * Purely a display choice — switching it never alters a stored rating, since
 * everything is kept on the canonical 0–10 scale underneath.
 */
export default function RatingFormatRow({
  label,
  value,
  disabled = false,
  onChange,
}: RatingFormatRowProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>

      <View style={styles.segment}>
        {OPTIONS.map((option) => {
          const isSelected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              disabled={disabled || isSelected}
              style={({ pressed }) => [
                styles.option,
                isSelected && styles.optionSelected,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              accessibilityLabel={`${label}: ${option.label}`}
            >
              <Text
                style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  segment: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#1b1b1b',
    padding: 3,
    gap: 3,
  },
  option: {
    paddingHorizontal: 12,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionSelected: {
    backgroundColor: '#373737',
  },
  optionLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
  optionLabelSelected: {
    color: Colors.white,
  },
  pressed: {
    opacity: 0.7,
  },
});
