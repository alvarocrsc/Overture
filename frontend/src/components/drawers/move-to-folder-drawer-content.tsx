import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { useFolderTree, useMoveListToFolder } from '@/src/hooks/use-lists';
import FolderNameInputDrawerContent from '@/src/components/drawers/folder-name-input-drawer-content';
import type { ListFolder } from '@/src/types/lists.types';

const CREATE_BG = '#292929';
/** Horizontal indent applied per nesting level. */
const INDENT_STEP = 22;

interface MoveToFolderDrawerContentProps {
  /** The list being moved. */
  listId: number;
  /** The folder the list currently sits in (null = root). */
  currentFolderId: number | null;
  /** Closes the drawer entirely. */
  onDismiss: () => void;
}

/** A folder flattened for rendering, carrying its nesting depth. */
interface FolderRenderRow {
  folder: ListFolder;
  depth: number;
}

/**
 * Body of the "Move to Folder" step rendered inside `BottomDrawer`.
 *
 * Shows a synthetic "Home" (root) row plus the user's folder tree, built
 * from the flat folder list returned by {@link useFolderTree}. Folders with
 * children can be expanded/collapsed via their chevron without triggering a
 * move; tapping a row's body moves the list into that folder (or to the root
 * for "Home").
 */
export default function MoveToFolderDrawerContent({
  listId,
  currentFolderId,
  onDismiss,
}: MoveToFolderDrawerContentProps): React.JSX.Element {
  const { data, isLoading } = useFolderTree();
  const { move, isPending } = useMoveListToFolder();

  // Local "create folder" sub-step toggle.
  const [creatingFolder, setCreatingFolder] = useState(false);
  // Folders whose children are currently expanded.
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set());
  // Optimistic selection so the checkmark reflects the latest move.
  const [selectedId, setSelectedId] = useState<number | null>(currentFolderId);

  const folders = useMemo(() => data?.folders ?? [], [data?.folders]);
  const rootFoldersCount = useMemo(
    () => folders.filter((f) => f.parent_folder_id === null).length,
    [folders],
  );
  const rootListsCount = data?.rootListsCount ?? 0;

  // Flatten the folder tree into render rows, respecting the expanded set.
  const renderRows = useMemo<FolderRenderRow[]>(() => {
    const build = (parentId: number | null, depth: number): FolderRenderRow[] =>
      folders
        .filter((f) => f.parent_folder_id === parentId)
        .flatMap((folder) => {
          const row: FolderRenderRow = { folder, depth };
          const children = expanded.has(folder.id)
            ? build(folder.id, depth + 1)
            : [];
          return [row, ...children];
        });
    return build(null, 1);
  }, [folders, expanded]);

  const toggleExpanded = (folderId: number): void => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleMove = (folderId: number | null): void => {
    if (isPending) return;
    setSelectedId(folderId);
    void move({ listId, folderId });
  };

  if (creatingFolder) {
    return (
      <FolderNameInputDrawerContent
        // TODO: support creating a folder nested under the row that was
        // tapped. For now new folders are always created at the root level.
        parentFolderId={null}
        onCancel={() => setCreatingFolder(false)}
        onCreated={() => setCreatingFolder(false)}
      />
    );
  }

  const homeSubtitle = `${rootFoldersCount} ${
    rootFoldersCount === 1 ? 'FOLDER' : 'FOLDERS'
  }, ${rootListsCount} ${rootListsCount === 1 ? 'LIST' : 'LISTS'}`;

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>Move to Folder</Text>
        <View style={styles.backButton} />
      </View>

      {/* Create new folder */}
      <Pressable
        onPress={() => setCreatingFolder(true)}
        style={({ pressed }) => [styles.createRow, pressed && styles.pressed]}
      >
        <Text style={styles.createText}>Create new folder</Text>
        <View style={styles.plusSquare}>
          <Ionicons name="add" size={16} color={Colors.white} />
        </View>
      </Pressable>

      {/* Folder tree */}
      <View style={styles.treeContainer}>
        {isLoading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator color={Colors.accentBlue} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Home / root row */}
            <FolderTreeRow
              label="Home"
              subtitle={homeSubtitle}
              depth={0}
              icon="home"
              selected={selectedId === null}
              expandable={false}
              expanded={false}
              onToggle={() => undefined}
              onPress={() => handleMove(null)}
            />

            {renderRows.map(({ folder, depth }) => (
              <FolderTreeRow
                key={folder.id}
                label={folder.name}
                subtitle={`${folder.subfolders_count} ${
                  folder.subfolders_count === 1 ? 'FOLDER' : 'FOLDERS'
                }, ${folder.lists_count} ${
                  folder.lists_count === 1 ? 'LIST' : 'LISTS'
                }`}
                depth={depth}
                icon="folder"
                selected={selectedId === folder.id}
                expandable={folder.subfolders_count > 0}
                expanded={expanded.has(folder.id)}
                onToggle={() => toggleExpanded(folder.id)}
                onPress={() => handleMove(folder.id)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Done */}
      <Pressable
        onPress={onDismiss}
        style={({ pressed }) => [styles.doneButton, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Done"
      >
        <Text style={styles.doneText}>Done</Text>
      </Pressable>
    </View>
  );
}

interface FolderTreeRowProps {
  label: string;
  subtitle: string;
  depth: number;
  icon: keyof typeof Ionicons.glyphMap;
  selected: boolean;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
  onPress: () => void;
}

function FolderTreeRow({
  label,
  subtitle,
  depth,
  icon,
  selected,
  expandable,
  expanded,
  onToggle,
  onPress,
}: FolderTreeRowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.treeRow, pressed && styles.pressed]}
    >
      <View style={{ width: depth * INDENT_STEP }} />

      {/* Chevron toggles expansion without moving the list. */}
      {expandable ? (
        <Pressable
          onPress={onToggle}
          hitSlop={8}
          style={styles.chevron}
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Collapse folder' : 'Expand folder'}
        >
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={16}
            color={Colors.textMuted}
          />
        </Pressable>
      ) : (
        <View style={styles.chevron} />
      )}

      <Ionicons name={icon} size={20} color={Colors.textMuted} />

      <View style={styles.treeText}>
        <Text style={styles.treeLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.treeSubtitle} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>

      <View style={[styles.checkCircle, selected && styles.checkCircleActive]}>
        {selected ? (
          <Ionicons name="checkmark" size={14} color={Colors.white} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
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
  treeContainer: {
    maxHeight: 320,
  },
  loadingWrap: {
    paddingVertical: 28,
    alignItems: 'center',
  },
  treeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  chevron: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  treeText: {
    flex: 1,
    marginLeft: 10,
    gap: 2,
  },
  treeLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  treeSubtitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: Colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleActive: {
    backgroundColor: Colors.accentBlue,
    borderColor: Colors.accentBlue,
  },
  doneButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  doneText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.buttonText,
    letterSpacing: LetterSpacing.tight,
  },
});
