import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import type {
  FilmCastMember,
  FilmCrewMember,
  Genre,
} from '@/src/types/film.types';

type SubTab = 'cast' | 'crew' | 'genres';

interface CastCrewGenresTabsProps {
  cast: FilmCastMember[];
  crew: FilmCrewMember[];
  genres: Genre[];
  onPressPerson?: (personTmdbId: number) => void;
  onPressGenre?: (genre: Genre) => void;
}

const INITIAL_VISIBLE = 10;

/**
 * Three-option switcher (Cast / Crew / Genres) with a vertical list of
 * the selected category. Cast rows show avatar + name + character; crew
 * rows show avatar + name + job (one row per job, so a person can appear
 * multiple times with different jobs); genres render as a stack of
 * pill rows.
 */
export default function CastCrewGenresTabs({
  cast,
  crew,
  genres,
  onPressPerson,
  onPressGenre,
}: CastCrewGenresTabsProps): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SubTab>('cast');
  const [expanded, setExpanded] = useState<boolean>(false);

  const list = useMemo<
    | { kind: 'people'; rows: (FilmCastMember | FilmCrewMember)[] }
    | { kind: 'genres'; rows: Genre[] }
  >(() => {
    if (activeTab === 'cast') {
      return { kind: 'people', rows: cast };
    }
    if (activeTab === 'crew') {
      return { kind: 'people', rows: crew };
    }
    return { kind: 'genres', rows: genres };
  }, [activeTab, cast, crew, genres]);

  const total = list.rows.length;
  const visibleCount = expanded ? total : Math.min(INITIAL_VISIBLE, total);
  const remaining = Math.max(0, total - visibleCount);

  return (
    <View style={styles.container}>
      {/* Tab switcher */}
      <View style={styles.tabs}>
        {(['cast', 'crew', 'genres'] as const).map((tab) => {
          const isActive = tab === activeTab;
          return (
            <Pressable
              key={tab}
              onPress={() => {
                setActiveTab(tab);
                setExpanded(false);
              }}
              style={[styles.tab, isActive && styles.tabActive]}
            >
              <Text style={styles.tabLabel}>{tab.toUpperCase()}</Text>
            </Pressable>
          );
        })}
      </View>

      {/* List */}
      <View style={styles.list}>
        {list.kind === 'people'
          ? list.rows.slice(0, visibleCount).map((row, idx) => {
              const subtitle =
                activeTab === 'cast'
                  ? (row as FilmCastMember).character_name ?? null
                  : (row as FilmCrewMember).job;
              const avatar = posterUrl(row.profile_path, 'w342');
              const key =
                activeTab === 'crew'
                  ? `${row.person_tmdb_id}-${(row as FilmCrewMember).job}-${idx}`
                  : `${row.person_tmdb_id}-${idx}`;
              return (
                <Pressable
                  key={key}
                  onPress={() => onPressPerson?.(row.person_tmdb_id)}
                  style={({ pressed }) => [styles.personRow, pressed && styles.pressed]}
                >
                  {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, styles.avatarFallback]} />
                  )}
                  <View style={styles.personMeta}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {row.person_name}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.personSubtitle} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Pressable>
              );
            })
          : list.rows.slice(0, visibleCount).map((g) => (
              <Pressable
                key={g.id}
                onPress={() => onPressGenre?.(g)}
                style={({ pressed }) => [styles.genreRow, pressed && styles.pressed]}
              >
                <Text style={styles.genreName}>{g.name}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </Pressable>
            ))}

        {remaining > 0 ? (
          <Pressable
            onPress={() => setExpanded(true)}
            style={({ pressed }) => [styles.showMore, pressed && styles.pressed]}
          >
            <Text style={styles.showMoreLabel}>{`Show ${remaining} more`}</Text>
            <Ionicons name="chevron-down" size={16} color={Colors.white} />
          </Pressable>
        ) : null}

        {total === 0 ? (
          <Text style={styles.emptyText}>Nothing here yet.</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 22,
    marginHorizontal: 20,
  },
  tabs: {
    backgroundColor: '#292929',
    borderRadius: 7,
    height: 40,
    flexDirection: 'row',
    padding: 6,
    gap: 4,
  },
  tab: {
    flex: 1,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(126,126,126,0.25)',
  },
  tabLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
  },
  list: {
    marginTop: 16,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 50,
    marginBottom: 10,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 100,
  },
  avatarFallback: {
    backgroundColor: '#2a2a2a',
  },
  personMeta: {
    flex: 1,
    justifyContent: 'center',
  },
  personName: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  personSubtitle: {
    fontFamily: FontFamily.light,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginTop: 2,
  },
  genreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  genreName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  showMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingVertical: 12,
  },
  showMoreLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
