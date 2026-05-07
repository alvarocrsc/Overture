import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily } from '@/src/lib/colors';
import type { MemberSearchResult } from '@/src/types/search.types';

interface Props {
  item: MemberSearchResult;
  isFollowing?: boolean;
  onPress: () => void;
  onFollowPress: () => void;
  onRemove?: () => void;
}

export default function MemberSearchItem({
  item,
  isFollowing,
  onPress,
  onFollowPress,
  onRemove,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.avatar}>
        {item.avatarUrl ? (
          <Image
            source={{ uri: item.avatarUrl }}
            style={styles.avatarImage}
            contentFit="cover"
          />
        ) : (
          <View style={styles.avatarFallback} />
        )}
      </View>

      <View style={styles.textStack}>
        <Text style={styles.name} numberOfLines={1}>
          {item.displayName}
        </Text>
        <Text style={styles.handle} numberOfLines={1}>
          @{item.username}
        </Text>
      </View>

      <Pressable
        onPress={onFollowPress}
        style={({ pressed }) => [
          styles.followPill,
          isFollowing && styles.followPillActive,
          pressed && styles.pressed,
        ]}
        hitSlop={6}
      >
        <Ionicons
          name={isFollowing ? 'checkmark' : 'person-add-outline'}
          size={12}
          color={Colors.white}
          style={styles.followIcon}
        />
        <Text style={styles.followLabel}>{isFollowing ? 'Following' : 'Follow'}</Text>
      </Pressable>

      {onRemove && (
        <Pressable
          onPress={onRemove}
          hitSlop={8}
          style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}
        >
          <Ionicons name="close" size={16} color={Colors.white} />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 100,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarFallback: {
    flex: 1,
    backgroundColor: '#222',
  },
  textStack: {
    flex: 1,
    paddingLeft: 12,
    justifyContent: 'center',
  },
  name: {
    fontFamily: FontFamily.extraBold,
    fontSize: 17,
    color: Colors.white,
    letterSpacing: -1,
    lineHeight: 19,
  },
  handle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10.5,
    color: Colors.accentBlue,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  followPill: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 27,
    paddingHorizontal: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  followPillActive: {
    backgroundColor: 'rgba(26,119,218,0.8)',
    borderColor: 'transparent',
  },
  followIcon: {
    marginRight: 5,
  },
  followLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 11,
    color: Colors.white,
    letterSpacing: -0.5,
  },
  removeButton: {
    paddingLeft: 12,
  },
});
