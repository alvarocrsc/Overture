import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserAvatar } from '@/src/components/shared/UserAvatar';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { timeAgo } from '@/src/lib/timeAgo';

/** Minimal comment shape this row needs — matches backend `ReviewComment`. */
export interface CommentRowData {
  id: number;
  user_id: number | null;
  username: string | null;
  avatar_url: string | null;
  body: string | null;
  likes_count: number;
  is_liked: boolean;
  is_deleted: boolean;
  created_at: string;
}

interface CommentRowProps {
  comment: CommentRowData;
  isReply?: boolean;
  onPressLike: (commentId: number, currentlyLiked: boolean) => void;
  onPressReply: (commentId: number, username: string | null) => void;
  onPressUser?: (userId: number) => void;
}

export function CommentRow({
  comment,
  isReply = false,
  onPressLike,
  onPressReply,
  onPressUser,
}: CommentRowProps): React.JSX.Element {
  const username = comment.username ?? 'deleted';
  const displayBody = comment.is_deleted
    ? '[deleted]'
    : (comment.body ?? '');

  return (
    <View style={[styles.row, isReply && styles.rowReply]}>
      <Pressable
        onPress={() => comment.user_id != null && onPressUser?.(comment.user_id)}
        hitSlop={6}
        disabled={comment.user_id == null || onPressUser == null}
        accessibilityRole="button"
        accessibilityLabel={`View ${username}'s profile`}
      >
        <UserAvatar
          avatarUrl={comment.avatar_url}
          username={username}
          size={36}
        />
      </Pressable>
      <View style={styles.body}>
        <Text style={styles.username}>{username}</Text>
        <Text style={styles.text}>{renderBodyWithMentions(displayBody)}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{timeAgo(comment.created_at)}</Text>
          <Pressable
            onPress={() => onPressLike(comment.id, comment.is_liked)}
            hitSlop={8}
            style={styles.likeBtn}
            accessibilityRole="button"
            accessibilityLabel={
              comment.is_liked ? 'Unlike comment' : 'Like comment'
            }
          >
            <Ionicons
              name={comment.is_liked ? 'heart' : 'heart-outline'}
              size={14}
              color={comment.is_liked ? Colors.accentBlue : Colors.textMuted}
            />
            {comment.likes_count > 0 ? (
              <Text style={styles.meta}>{comment.likes_count}</Text>
            ) : null}
          </Pressable>
          <Pressable
            onPress={() => onPressReply(comment.id, comment.username)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Reply"
          >
            <Text style={styles.replyBtn}>Reply</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function renderBodyWithMentions(body: string): React.ReactNode {
  const parts = body.split(/(@\w+)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('@')) {
      return (
        <Text key={idx} style={styles.mention}>
          {part}
        </Text>
      );
    }
    return part;
  });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
  },
  rowReply: {
    paddingLeft: 62,
  },
  body: {
    flex: 1,
  },
  username: {
    fontFamily: FontFamily.medium,
    fontSize: 14,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
    marginBottom: 2,
  },
  text: {
    fontFamily: FontFamily.light,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 20,
    includeFontPadding: false,
  },
  mention: {
    fontFamily: FontFamily.medium,
    color: Colors.accentBlue,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  meta: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyBtn: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
});
