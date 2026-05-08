import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing } from '@/src/lib/colors';
import type { StreakData } from '@/src/types/stats.types';

interface Props {
  streak: StreakData;
}

const CIRCLE_SIZE = 40;

/**
 * Returns the day-of-week single-letter label for a date in the
 * "M T W T F S S" sequence used across the screen.
 */
function dayLabel(date: Date): string {
  const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return labels[date.getDay()] ?? '';
}

export default function StreakDisplay({ streak }: Props): React.JSX.Element {
  const today = new Date();

  const labels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(dayLabel(d));
  }

  const orderedDays = [...streak.last_7_days].reverse();

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.daysLabel}>{streak.longest} DAYS</Text>
        <Text style={styles.currentLabel}>Current: {streak.current} days</Text>
      </View>

      <View style={styles.dayLabelRow}>
        {labels.map((l, i) => {
          const isToday = i === labels.length - 1;
          return (
            <View key={i} style={styles.dayLabelCell}>
              <Text style={[styles.dayLabelText, isToday && styles.dayLabelTextToday]}>
                {l}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.circleRow}>
        {orderedDays.map((checked, i) => {
          const isToday = i === orderedDays.length - 1;
          return (
            <View key={i} style={styles.circleSlot}>
              {/* Outer dark ring — border shown inside when today */}
              <View style={[styles.circle, isToday && styles.circleTodayBorder]}>
                {/* Inner blue circle — only when checked */}
                {checked ? (
                  <View style={styles.circleChecked}>
                    <Ionicons name="checkmark" size={16} color="#1A1A1A" />
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenH,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  daysLabel: {
    fontFamily: FontFamily.black,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  currentLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
  },
  dayLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  dayLabelCell: {
    width: CIRCLE_SIZE + 8,
    alignItems: 'center',
  },
  dayLabelText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.textMuted,
  },
  dayLabelTextToday: {
    color: Colors.accentBlue,
  },
  circleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  circleSlot: {
    width: CIRCLE_SIZE + 8,
    height: CIRCLE_SIZE + 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleChecked: {
    width: CIRCLE_SIZE / 1.55,
    height: CIRCLE_SIZE / 1.55,
    borderRadius: CIRCLE_SIZE / 1.55 / 2,
    backgroundColor: Colors.accentBlue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleTodayBorder: {
    borderWidth: 1.2,
    borderColor: Colors.accentBlue,
  },
});
