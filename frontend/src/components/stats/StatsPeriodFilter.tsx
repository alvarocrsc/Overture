import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily, Spacing } from '@/src/lib/colors';
import type { StatsPeriod } from '@/src/types/stats.types';

interface Props {
  active: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
}

interface PeriodOption {
  value: StatsPeriod;
  label: string;
}

const OPTIONS: PeriodOption[] = [
  { value: 'month', label: 'This month' },
  { value: 'year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

export default function StatsPeriodFilter({ active, onChange }: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const isActive = opt.value === active;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={({ pressed }) => [
              styles.pill,
              isActive ? styles.pillActive : styles.pillInactive,
              pressed && !isActive && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.label, isActive ? styles.labelActive : styles.labelInactive]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.screenH,
    gap: 10,
    marginBottom: 16,
  },
  pill: {
    flex: 1,
    height: 27,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: Colors.accentBlue,
  },
  pillInactive: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  label: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
  },
  labelActive: {
    color: Colors.white,
  },
  labelInactive: {
    color: Colors.white,
  },
});
