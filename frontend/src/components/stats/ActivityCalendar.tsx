import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Spacing } from '@/src/lib/colors';
import { backdropUrl } from '@/src/lib/tmdb';
import type { CalendarEntry } from '@/src/types/stats.types';

interface Props {
  calendar: CalendarEntry[];
}

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

/**
 * Returns the index (0-6) of a date column when the week starts on Monday.
 */
function mondayWeekday(date: Date): number {
  const d = date.getDay();
  return d === 0 ? 6 : d - 1;
}

/**
 * Formats a Date to ISO YYYY-MM-DD using local time.
 */
function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface Cell {
  /** Day-of-month number, or null for blanks before the 1st. */
  day: number | null;
  /** ISO YYYY-MM-DD for this cell (null for spacers). */
  iso: string | null;
  /** Matching CalendarEntry for the date, if any. */
  entry: CalendarEntry | null;
}

/**
 * Monthly calendar grid showing the user's logged activity for the
 * current calendar month. Days with logged films show the title's
 * backdrop and the highest rating given that day.
 */
export default function ActivityCalendar({ calendar }: Props): React.JSX.Element {
  const today = new Date();
  const todayISO = toISODate(today);

  const cells = useMemo<Cell[]>(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstOfMonth = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingBlanks = mondayWeekday(firstOfMonth);

    const byDate = new Map<string, CalendarEntry>();
    for (const entry of calendar) byDate.set(entry.date, entry);

    const result: Cell[] = [];
    for (let i = 0; i < leadingBlanks; i++) result.push({ day: null, iso: null, entry: null });
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = toISODate(new Date(year, month, day));
      result.push({ day, iso, entry: byDate.get(iso) ?? null });
    }
    while (result.length % 7 !== 0) result.push({ day: null, iso: null, entry: null });
    return result;
  }, [calendar]);

  const rows: Cell[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View style={styles.container}>
      <View style={styles.dayHeader}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>
            {d}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {rows.map((row, rIdx) => (
          <View key={rIdx} style={styles.gridRow}>
            {row.map((cell, cIdx) => {
              const isToday = cell.iso === todayISO;
              return (
              <View key={cIdx} style={styles.cellWrapper}>
                {cell.day === null ? (
                  // Transparent spacer — keeps grid columns aligned without
                  // showing a filled cell for days outside the current month.
                  <View style={styles.cellSpacer} />
                ) : cell.entry ? (
                  <View style={styles.cellFilled}>
                    {cell.entry.backdrop_path ? (
                      <Image
                        source={{
                          uri: backdropUrl(cell.entry.backdrop_path, 'w300') ?? undefined,
                        }}
                        style={styles.cellImage}
                      />
                    ) : null}
                    <View style={styles.cellOverlay} />
                    {/* Day number + rating on the same baseline row */}
                    <View style={styles.cellTopRow}>
                      <Text style={styles.cellDay}>{cell.day}</Text>
                      <View style={styles.cellRating}>
                        <Ionicons name="star" size={7} color={Colors.accentBlue} />
                        <Text style={styles.cellRatingText}>
                          {Number(cell.entry.highest_rating ?? 0).toFixed(1)}
                        </Text>
                      </View>
                    </View>
                    {isToday && <View style={styles.todayDot} />}
                  </View>
                ) : (
                  <View style={styles.cellEmpty}>
                    <Text style={styles.cellDayMuted}>{cell.day}</Text>
                    {isToday && <View style={styles.todayDot} />}
                  </View>
                )}
              </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const CELL_GAP = 3;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.screenH,
  },
  dayHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  dayLabel: {
    flex: 1,
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  grid: {
    gap: CELL_GAP,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  cellWrapper: {
    flex: 1,
    aspectRatio: 1,
  },
  cellSpacer: {
    flex: 1,
  },
  cellEmpty: {
    flex: 1,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
    padding: 5,
  },
  cellFilled: {
    flex: 1,
    borderRadius: 8,
    overflow: 'hidden',
    padding: 5,
  },
  cellImage: {
    ...StyleSheet.absoluteFillObject,
    resizeMode: 'cover',
  },
  cellOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.57)',
  },
  cellTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cellDay: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.white,
  },
  cellDayMuted: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: Colors.textMuted,
  },
  cellRating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  cellRatingText: {
    fontFamily: FontFamily.black,
    fontSize: 8,
    color: Colors.accentBlue,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2,
    backgroundColor: Colors.accentBlue,
    alignSelf: 'flex-start',
    marginTop: 5,
    marginBottom: 4,
  },
});
