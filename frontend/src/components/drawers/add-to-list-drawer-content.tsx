import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { posterUrl } from '@/src/lib/tmdb';
import {
  useListMembership,
  useToggleListItem,
  type ListMembershipRow,
} from '@/src/hooks/use-lists';

interface AddToListDrawerContentProps {
  mediaType: 'film' | 'series';
  tmdbId: number;
  onBack: () => void;
  /** Advances the drawer to the Create-new-list step. */
  onCreateNew: () => void;
}

/**
 * Body of the "Add to list" step rendered inside `BottomDrawer`.
 * Fetches every list owned by the user (via `useListMembership`),
 * shows a row per list with an optimistic toggle, plus a
 * "Create new list" entry that advances to the create-list step.
 * The Done button is provided by the surrounding `BottomDrawer`.
 */
export default function AddToListDrawerContent({
  mediaType,
  tmdbId,
  onBack,
  onCreateNew,
}: AddToListDrawerContentProps): React.JSX.Element {
  const { rows, isLoading } = useListMembership(tmdbId, mediaType);
  const { toggle, isPending } = useToggleListItem(tmdbId, mediaType);

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Add to List</Text>
        {/* Spacer to keep the title visually centred against the back button */}
        <View style={styles.backButton} />
      </View>

      {/* Create new list */}
      <Pressable
        onPress={onCreateNew}
        style={({ pressed }) => [
          styles.createRow,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.createText}>Create new list</Text>
        <View style={styles.plusSquare}>
          <Ionicons name="add" size={16} color={Colors.white} />
        </View>
      </Pressable>

      {/* List of lists */}
      <View style={styles.listContainer}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.accentBlue} />
          </View>
        ) : rows.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>You don&apos;t have any lists yet.</Text>
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(row) => String(row.list.id)}
            renderItem={({ item }) => (
              <ListRow
                row={item}
                disabled={isPending}
                onToggle={() =>
                  toggle({ listId: item.list.id, itemId: item.itemId })
                }
              />
            )}
            ItemSeparatorComponent={() => <View style={styles.rowSeparator} />}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Row
// ---------------------------------------------------------------------------

interface ListRowProps {
  row: ListMembershipRow;
  disabled: boolean;
  onToggle: () => void;
}

function ListRow({ row, disabled, onToggle }: ListRowProps): React.JSX.Element {
  const { list, detail, itemId } = row;
  const isMember = itemId !== null;

  return (
    <Pressable
      onPress={onToggle}
      disabled={disabled}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ListThumbnail detail={detail} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {list.title}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          <Text style={styles.rowMetaCount}>{`${list.items_count} TITLES `}</Text>
          <Text style={styles.rowMetaDot}>·</Text>
          <Text style={styles.rowMetaLabel}>{' LIST BY'}</Text>
        </Text>
        <Text style={styles.rowOwner} numberOfLines={1}>
          {list.owner_username}
        </Text>
      </View>
      <View
        style={[
          styles.checkbox,
          isMember && styles.checkboxActive,
        ]}
      >
        {isMember ? (
          <Ionicons name="checkmark" size={14} color={Colors.white} />
        ) : null}
      </View>
    </Pressable>
  );
}

/**
 * 50x42 mosaic-style thumbnail. Uses the first item's poster, if any.
 * Falls back to a placeholder block when the list is empty or the
 * detail query hasn't resolved yet.
 *
 * TODO(list-thumbnail): replace with the full collage logic to match
 * the design — 0 items (or icon_url set) → icon_url / placeholder;
 * 1–5 items → first item backdrop; 6+ items → a 2×3 grid of six
 * backdrops cropped at a 87/73 aspect ratio.
 */
function ListThumbnail({
  detail,
}: {
  detail: import('@/src/services/lists.service').ListDetail | undefined;
}): React.JSX.Element {
  const firstPoster = (() => {
    if (!detail) return null;
    for (const item of detail.items) {
      const p = item.film_poster ?? item.series_poster;
      if (p) return p;
    }
    return null;
  })();
  const uri = posterUrl(firstPoster, 'w185');

  return (
    <View style={styles.thumb}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
      ) : null}
    </View>
  );
}

const CREATE_BG = '#292929';

const styles = StyleSheet.create({
  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 14,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.black,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  // ── Create new list ──────────────────────────────────────────────────────
  createRow: {
    height: 42,
    borderRadius: 12,
    backgroundColor: CREATE_BG,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 8,
    marginBottom: 14,
  },
  createText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.white,
  },
  plusSquare: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // ── List ─────────────────────────────────────────────────────────────────
  listContainer: {
    maxHeight: 320,
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
  },
  rowSeparator: {
    height: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  thumb: {
    width: 50,
    height: 42,
    borderRadius: 3,
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  rowText: {
    flex: 1,
    marginLeft: 12,
  },
  rowTitle: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  rowMeta: {
    fontSize: 10.5,
    color: Colors.white,
    marginTop: 2,
  },
  rowMetaCount: {
    fontFamily: FontFamily.semiBold,
    color: Colors.accentBlue,
  },
  rowMetaDot: {
    fontFamily: FontFamily.regular,
    color: Colors.white,
  },
  rowMetaLabel: {
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  rowOwner: {
    fontFamily: FontFamily.light,
    fontSize: 10.5,
    color: Colors.white,
    marginTop: 2,
  },
  // ── Checkbox ─────────────────────────────────────────────────────────────
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxActive: {
    backgroundColor: Colors.accentBlue,
    borderColor: Colors.accentBlue,
  },
  pressed: {
    opacity: 0.7,
  },
});
