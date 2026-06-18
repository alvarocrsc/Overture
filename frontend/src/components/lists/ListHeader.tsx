import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { ListThumbnail } from '@/src/components/lists/ListThumbnail';
import type { ListDetail, NormalizedListItem } from '@/src/types/lists.types';

/** Card / chip background colour from Figma. */
const CARD_BG = '#292929';
/** Collage thumbnail width from Figma (174×146). */
const THUMBNAIL_WIDTH = 174;
/** Content width from Figma (390 − 2×20 screen padding). */
const CONTENT_WIDTH = 350;

interface ListHeaderProps {
  list: ListDetail;
  items: NormalizedListItem[];
  onLikePress: () => void;
  onCommentPress: () => void;
  onSharePress: () => void;
  onOwnerPress: () => void;
}

/**
 * The shared header rendered above both the posters grid and the expanded
 * list: collage, title, item-count line, creator card and the interactions
 * bar (likes / comments / share), followed by a separator.
 */
export function ListHeader({
  list,
  items,
  onLikePress,
  onCommentPress,
  onSharePress,
  onOwnerPress,
}: ListHeaderProps): React.JSX.Element {
  const filmCount = items.filter((it) => it.mediaType === 'film').length;
  const seriesCount = items.filter((it) => it.mediaType === 'series').length;

  const isLiked = list.is_liked === 1;
  const ownerName = list.owner_name ?? list.owner_username;

  return (
    <View style={styles.container}>
      <View style={styles.thumbnailWrap}>
        <ListThumbnail
          iconUrl={list.icon_url}
          items={items}
          width={THUMBNAIL_WIDTH}
        />
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {list.title}
      </Text>

      <Text style={styles.count}>{formatCount(filmCount, seriesCount)}</Text>

      <Pressable style={styles.creatorCard} onPress={onOwnerPress}>
        <Text style={styles.listByLabel}>LIST BY:</Text>
        <UserAvatar
          avatarUrl={list.owner_avatar}
          username={list.owner_username}
          size={36}
        />
        <View style={styles.creatorText}>
          <Text style={styles.creatorName} numberOfLines={1}>
            {ownerName}
          </Text>
          <Text style={styles.creatorHandle} numberOfLines={1}>
            {`@${list.owner_username}`}
          </Text>
        </View>
      </Pressable>

      <View style={styles.actionsBar}>
        <Pressable style={styles.action} onPress={onLikePress} hitSlop={8}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={20}
            color={isLiked ? Colors.accentBlue : Colors.white}
          />
          <Text style={styles.actionCount}>{list.likes_count}</Text>
        </Pressable>

        <Pressable style={styles.action} onPress={onCommentPress} hitSlop={8}>
          <Ionicons name="chatbubble-outline" size={18} color={Colors.white} />
          <Text style={styles.actionCount}>{list.comments_count}</Text>
        </Pressable>

        <View style={styles.actionsSpacer} />

        <Pressable onPress={onSharePress} hitSlop={8}>
          <Ionicons name="paper-plane-outline" size={18} color={Colors.white} />
        </Pressable>
      </View>

      <View style={styles.separator} />
    </View>
  );
}

/** Builds the "X FILMS & Y SERIES" count line, omitting empty categories. */
function formatCount(filmCount: number, seriesCount: number): string {
  const parts: string[] = [];
  if (filmCount > 0) parts.push(`${filmCount} ${filmCount === 1 ? 'FILM' : 'FILMS'}`);
  if (seriesCount > 0) {
    parts.push(`${seriesCount} ${seriesCount === 1 ? 'SERIES' : 'SERIES'}`);
  }
  if (parts.length === 0) return '0 FILMS';
  return parts.join(' & ');
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  thumbnailWrap: {
    marginTop: 8,
  },
  title: {
    fontFamily: FontFamily.extraBold,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 18,
  },
  count: {
    fontFamily: FontFamily.semiBold,
    fontSize: 12,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    marginTop: 4,
  },
  creatorCard: {
    width: 273,
    height: 48,
    borderRadius: 7,
    backgroundColor: CARD_BG,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 24,
    marginTop: 16,
  },
  listByLabel: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    marginRight: 12,
  },
  creatorText: {
    marginLeft: 8,
  },
  creatorName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  creatorHandle: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.accentBlue,
    marginTop: 1,
  },
  actionsBar: {
    width: CONTENT_WIDTH,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 28,
  },
  actionCount: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginLeft: 7,
  },
  actionsSpacer: {
    flex: 1,
  },
  separator: {
    width: CONTENT_WIDTH,
    height: StyleSheet.hairlineWidth,
    backgroundColor: CARD_BG,
    marginTop: 18,
  },
});
