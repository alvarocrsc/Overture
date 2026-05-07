import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius } from '@/src/lib/colors';

interface Props {
  onPress: () => void;
}

export default function DiscoverSearchBar({ onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, pressed && styles.pressed]}
    >
      <View style={styles.iconWrapper}>
        <Ionicons name="search" size={16} color={Colors.white} />
      </View>
      <Text style={styles.placeholder}>Search for movies, TV shows or people</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 45,
    borderRadius: Radius.searchBar,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.7,
  },
  iconWrapper: {
    marginRight: 12,
  },
  placeholder: {
    fontFamily: FontFamily.light,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: -1,
  },
});
