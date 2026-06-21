import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import {
  Colors,
  FontFamily,
  LetterSpacing,
  TAB_BAR_BOTTOM_OFFSET,
  TAB_BAR_HEIGHT,
} from '@/src/lib/colors';
import {
  useDeleteList,
  usePinList,
  useUnpinList,
  useFolderContents,
} from '@/src/hooks/use-lists';
import { SwipeableListRow } from '@/src/components/lists/SwipeableListRow';
import { ListRowItem } from '@/src/components/lists/ListRowItem';
import { FolderRowItem } from '@/src/components/lists/FolderRowItem';
import BottomDrawer from '@/src/components/drawers/bottom-drawer';
import CreateListDrawerContent from '@/src/components/drawers/create-list-drawer-content';
import FolderNameInputDrawerContent from '@/src/components/drawers/folder-name-input-drawer-content';
import MoveToFolderDrawerContent from '@/src/components/drawers/move-to-folder-drawer-content';
import type { ListFolder, ListSummary } from '@/src/types/lists.types';

// ---------------------------------------------------------------------------
// Figma measurements — "Lists list (Dark)" frame.
// ---------------------------------------------------------------------------
const SCREEN_H_PAD = 20;
const ROW_GAP = 15;
const TITLE_TOP = 71;

/** A union row so lists and folders render in a single FlatList. */
type OverviewRow =
  | { kind: 'list'; list: ListSummary }
  | { kind: 'folder'; folder: ListFolder };

interface ListsOverviewContentProps {
  /** The folder being viewed, or null for the root level. */
  folderId: number | null;
}

/**
 * Folder-aware lists overview shared by `/lists/me` and
 * `/lists/folder/[folderId]`.
 *
 * Renders the lists inside the current folder first (each swipe-to-reveal
 * with Share / Move / Delete actions) followed by the folder's subfolders.
 * Only one swipe row is open at a time, tracked by `openRowId`.
 */
export default function ListsOverviewContent({
  folderId,
}: ListsOverviewContentProps): React.JSX.Element {
  const insets = useSafeAreaInsets();

  const { data, isLoading } = useFolderContents(folderId);
  const { remove } = useDeleteList();
  const { pin } = usePinList(folderId);
  const { unpin } = useUnpinList(folderId);

  const lists = data?.lists ?? [];
  const folders = data?.folders ?? [];
  const currentFolder = data?.currentFolder ?? null;

  // openRow tracks which row is open and which direction (left = actions, right = pin).
  const [openRow, setOpenRow] = useState<{ id: number; side: 'left' | 'right' } | null>(null);
  // Drawer visibility / targets.
  const [createListVisible, setCreateListVisible] = useState(false);
  const [folderInputVisible, setFolderInputVisible] = useState(false);
  const [moveTarget, setMoveTarget] = useState<ListSummary | null>(null);

  const rows: OverviewRow[] = [
    ...lists.map((list): OverviewRow => ({ kind: 'list', list })),
    ...folders.map((folder): OverviewRow => ({ kind: 'folder', folder })),
  ];

  const handleListCreated = (newList: ListSummary): void => {
    setCreateListVisible(false);
    router.push(`/list/${newList.id}`);
  };

  const handleShare = (list: ListSummary): void => {
    setOpenRow(null);
    // TODO: replace with a real shareable deep link once list URLs exist.
    void Share.share({
      message: `Check out the list "${list.title}" on Overture`,
    });
  };

  const handleMove = (list: ListSummary): void => {
    setOpenRow(null);
    setMoveTarget(list);
  };

  const handleDelete = (list: ListSummary): void => {
    setOpenRow(null);
    Alert.alert('Delete list?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void remove(list.id);
        },
      },
    ]);
  };

  const handlePin = (list: ListSummary): void => {
    setOpenRow(null);
    if (list.pin_order !== null) {
      void unpin(list.id);
    } else {
      void pin(list.id);
    }
  };

  const renderRow = ({ item }: { item: OverviewRow }): React.JSX.Element => {
    if (item.kind === 'folder') {
      return (
        <FolderRowItem
          folder={item.folder}
          onPress={() => router.push(`/lists/folder/${item.folder.id}`)}
        />
      );
    }

    const { list } = item;
    return (
      <SwipeableListRow
        openSide={openRow?.id === list.id ? openRow.side : null}
        onOpenLeft={() => setOpenRow({ id: list.id, side: 'left' })}
        onOpenRight={() => setOpenRow({ id: list.id, side: 'right' })}
        onClose={() => setOpenRow((prev) => (prev?.id === list.id ? null : prev))}
        onSharePress={() => handleShare(list)}
        onMovePress={() => handleMove(list)}
        onDeletePress={() => handleDelete(list)}
        onPinPress={() => handlePin(list)}
        isPinned={list.pin_order !== null}
      >
        <ListRowItem
          list={list}
          onPress={() => router.push(`/list/${list.id}`)}
        />
      </SwipeableListRow>
    );
  };

  const listHeaderContent = (
    <View style={styles.headerRow}>
      <Pressable
        style={({ pressed }) => [styles.createBtn, pressed && styles.pressed]}
        onPress={() => setCreateListVisible(true)}
      >
        <Text style={styles.createBtnText}>Create new list</Text>
        <View style={styles.createBtnSquare}>
          <Ionicons name="add" size={16} color={Colors.white} />
        </View>
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.folderBtn, pressed && styles.pressed]}
        onPress={() => setFolderInputVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Create new folder"
      >
        <Ionicons name="folder-open-outline" size={18} color={Colors.white} />
      </Pressable>
    </View>
  );

  const paddingBottom =
    insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* Back button */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 10 }]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.white} />
      </Pressable>

      {/* Title — vertically aligned with the back button (both at insets.top + 10). */}
      <Text style={[styles.title, { top: insets.top + 5}]} numberOfLines={1}>
        {currentFolder?.name ?? 'Lists'}
      </Text>

      {/* Content */}
      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) =>
            item.kind === 'list'
              ? `list-${item.list.id}`
              : `folder-${item.folder.id}`
          }
          renderItem={renderRow}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={listHeaderContent}
          ListHeaderComponentStyle={styles.listHeader}
          contentContainerStyle={[
            styles.listContent,
            { paddingTop: insets.top + 56, paddingBottom },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Create list drawer */}
      <BottomDrawer
        visible={createListVisible}
        onClose={() => setCreateListVisible(false)}
        backdropImageUri={null}
        logoUri={null}
        titleFallback="New List"
        showDoneButton={false}
      >
        <CreateListDrawerContent
          tmdbId={0}
          mediaType="film"
          onBack={() => setCreateListVisible(false)}
          onListCreated={handleListCreated}
        />
      </BottomDrawer>

      {/* New folder drawer */}
      <BottomDrawer
        visible={folderInputVisible}
        onClose={() => setFolderInputVisible(false)}
        backdropImageUri={null}
        logoUri={null}
        titleFallback="New Folder"
        showDoneButton={false}
      >
        <FolderNameInputDrawerContent
          parentFolderId={folderId}
          onCancel={() => setFolderInputVisible(false)}
          onCreated={() => setFolderInputVisible(false)}
        />
      </BottomDrawer>

      {/* Move to folder drawer */}
      <BottomDrawer
        visible={moveTarget !== null}
        onClose={() => setMoveTarget(null)}
        backdropImageUri={null}
        logoUri={null}
        titleFallback="Move to Folder"
        showDoneButton={false}
      >
        {moveTarget ? (
          <MoveToFolderDrawerContent
            listId={moveTarget.id}
            currentFolderId={moveTarget.folder_id}
            onDismiss={() => setMoveTarget(null)}
          />
        ) : (
          <View />
        )}
      </BottomDrawer>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  backBtn: {
    position: 'absolute',
    left: 30,
    zIndex: 10,
  },
  title: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '70%',
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    zIndex: 10,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: SCREEN_H_PAD,
  },
  listHeader: {
    marginBottom: ROW_GAP,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  createBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#292929',
    borderRadius: 12,
    height: 42,
    paddingLeft: 16,
    paddingRight: 8,
  },
  createBtnText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.white,
  },
  createBtnSquare: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#3a3a3a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  folderBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#292929',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  separator: {
    height: ROW_GAP,
  },
});
