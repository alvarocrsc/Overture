import { Pressable, StyleSheet } from 'react-native';

import EditScreenInfo from '@/components/EditScreenInfo';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/src/context/AuthContext';

export default function TabOneScreen() {
  const { logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tab One</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <EditScreenInfo path="app/(tabs)/index.tsx" />
      {/* TODO: remove once proper nav with logout is built */}
      <Pressable onPress={logout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  logoutButton: {
    marginTop: 24,
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: '#c0392b',
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
});
