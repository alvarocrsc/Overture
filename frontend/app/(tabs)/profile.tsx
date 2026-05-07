import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';
import { useAuth } from '@/src/context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.screen}>
      <Text style={styles.username}>{user?.username ?? 'Profile'}</Text>
      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  username: {
    fontFamily: FontFamily.bold,
    fontSize: 24,
    color: Colors.white,
  },
  logoutButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  logoutText: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textMuted,
  },
});
