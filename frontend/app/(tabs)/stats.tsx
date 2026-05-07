import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';

export default function StatsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.placeholder}>Stats</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.textMuted,
  },
});
