import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import InteractiveStarRating from '@/src/components/film/InteractiveStarRating';

interface MoreOptionsDrawerContentProps {
  isLogged: boolean;
  isLiked: boolean;
  rating: number;
  onToggleLogged: () => void;
  onChangeRating: (value: number) => void;
  onToggleLiked: () => void;
  /** Switches the drawer to its Add-to-List step. */
  onPressAddToList: () => void;
  onChangeAppearance: () => void;
  onShare: () => void | Promise<void>;
}

/**
 * Body of the "More options" step rendered inside `BottomDrawer`.
 * Shows the LOGGED / RATING / LIKED stats row plus three action rows
 * (Add to list, Change poster | Backdrop, Share). The bottom "Done"
 * button is provided by the surrounding `BottomDrawer`.
 */
export default function MoreOptionsDrawerContent({
  isLogged,
  isLiked,
  rating,
  onToggleLogged,
  onChangeRating,
  onToggleLiked,
  onPressAddToList,
  onChangeAppearance,
  onShare,
}: MoreOptionsDrawerContentProps): React.JSX.Element {
  return (
    <View>
      <View style={styles.statsRow}>
        <StatusCell label="LOGGED" onPress={onToggleLogged}>
          <Ionicons
            name={isLogged ? 'checkmark-circle' : 'checkmark-circle-outline'}
            size={28}
            color={isLogged ? Colors.accentBlue : Colors.white}
          />
        </StatusCell>

        <View style={styles.statCell}>
          <InteractiveStarRating
            value={rating}
            onChange={onChangeRating}
            size={22}
            gap={2}
          />
          <Text style={styles.statLabel}>RATING</Text>
        </View>

        <StatusCell label="LIKED" onPress={onToggleLiked}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={isLiked ? Colors.accentBlue : Colors.white}
          />
        </StatusCell>
      </View>

      <ActionRow label="Add to list" onPress={onPressAddToList} />
      <ActionRow
        label="Change poster | Backdrop"
        onPress={onChangeAppearance}
      />
      <ActionRow label="Share" onPress={onShare} />
    </View>
  );
}

interface StatusCellProps {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}

function StatusCell({
  label,
  onPress,
  children,
}: StatusCellProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statCell, pressed && styles.pressed]}
      hitSlop={6}
    >
      {children}
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

interface ActionRowProps {
  label: string;
  onPress: () => void | Promise<void>;
}

function ActionRow({ label, onPress }: ActionRowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 18,
    paddingBottom: 12,
  },
  statCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 100,
    gap: 12,
  },
  statLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 12,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textTransform: 'uppercase',
  },
  actionRow: {
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  pressed: {
    opacity: 0.7,
  },
});
