import React, { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useAuth } from '@/src/context/AuthContext';
import { useMyLists, useUserLists } from '@/src/hooks/use-lists';
import { UserListRow } from '@/src/components/lists/UserListRow';
import BottomDrawer from '@/src/components/drawers/bottom-drawer';
import CreateListDrawerContent from '@/src/components/drawers/create-list-drawer-content';
import type { ListSummary } from '@/src/types/lists.types';

// ---------------------------------------------------------------------------
// Figma measurements — "Lists list (Dark)" frame, node 1394:114
// ---------------------------------------------------------------------------
/** Horizontal padding on both sides of the 390px screen → 350px content. */
const SCREEN_H_PAD = 20;
/** "Create new list" button y-position from screen top. */
const CREATE_BTN_TOP = 125;
/** "Create new list" button height. */
const CREATE_BTN_H = 40;
/** Gap between list rows (Figma: 57px start-to-start − 42px row height). */
const ROW_GAP = 15;
/** Title y-position (status-bar-relative). */
const TITLE_TOP = 71;

/**
 * Screen that shows all of a user's lists.
 *
 * Route: `/user-lists/[userId]`
 *
 * If the authenticated user matches `userId` this renders the own-profile
 * variant (owned + saved lists, plus a "Create new list" button).
 * Otherwise it renders the public lists for the given user.
 */
export default function UserListsScreen(): React.JSX.Element {
  const params = useLocalSearchParams<{ userId: string }>();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const userId = Number(params.userId);
  const isOwn = user != null && userId === user.id;

  // Conditionally call hooks — but Rules of Hooks requires we always call both
  // and choose the appropriate result below.
  const myListsQ = useMyLists();
  const userListsQ = useUserLists(isOwn ? null : userId);

  const listsQuery = isOwn ? myListsQ : userListsQ;
  const lists: ListSummary[] = listsQuery.data ?? [];

  const [drawerVisible, setDrawerVisible] = useState(false);

  const handleCreatePress = (): void => setDrawerVisible(true);
  const handleDrawerClose = (): void => setDrawerVisible(false);

  const handleListCreated = (newList: ListSummary): void => {
    setDrawerVisible(false);
    router.push(`/list/${newList.id}`);
  };

  const handleRowPress = (list: ListSummary): void => {
    router.push(`/list/${list.id}`);
  };

  const listHeaderContent = (
    <>
      {/* ── "Create new list" button (own profile only) ── */}
      {isOwn && (
        <Pressable
          style={({ pressed }) => [
            styles.createBtn,
            pressed && styles.createBtnPressed,
          ]}
          onPress={handleCreatePress}
        >
          <Text style={styles.createBtnText}>Create new list</Text>
          <Ionicons
            name="add"
            size={15.75}
            color={Colors.white}
            style={styles.createBtnIcon}
          />
        </Pressable>
      )}
    </>
  );

  const contentPaddingTop = TITLE_TOP + 24 + CREATE_BTN_TOP - TITLE_TOP;
  const paddingBottom =
    insets.bottom + TAB_BAR_HEIGHT + TAB_BAR_BOTTOM_OFFSET + 16;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />

      {/* ── Back button ── */}
      <Pressable
        style={[styles.backBtn, { top: insets.top + 10 }]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={24} color={Colors.white} />
      </Pressable>

      {/* ── Page title ── */}
      <Text style={[styles.title, { top: insets.top + TITLE_TOP - 34 }]}>
        Lists
      </Text>

      {/* ── Lists ── */}
      {listsQuery.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={Colors.white} />
        </View>
      ) : (
        <FlatList
          data={lists}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <UserListRow list={item} onPress={() => handleRowPress(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={listHeaderContent}
          ListHeaderComponentStyle={styles.listHeader}
          contentContainerStyle={[
            styles.listContent,
            {
              paddingTop: insets.top + contentPaddingTop,
              paddingBottom,
            },
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* ── Create list drawer ── */}
      <BottomDrawer
        visible={drawerVisible}
        onClose={handleDrawerClose}
        backdropImageUri={null}
        logoUri={null}
        titleFallback="New List"
        showDoneButton={false}
      >
        <CreateListDrawerContent
          tmdbId={0}
          mediaType="film"
          onBack={handleDrawerClose}
          onListCreated={handleListCreated}
        />
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
    // The create button sits above the first row.
    marginBottom: ROW_GAP,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#292929',
    borderRadius: 12,
    height: CREATE_BTN_H,
    paddingLeft: 20,
    // Width from Figma: 340px (5px indent from 350px content area).
    marginLeft: 5,
    marginRight: 5,
  },
  createBtnPressed: {
    opacity: 0.7,
  },
  createBtnText: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.white,
  },
  createBtnIcon: {
    marginRight: 21,
  },
  separator: {
    height: ROW_GAP,
  },
});
