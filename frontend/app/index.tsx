import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/src/context/AuthContext';
import { Colors } from '@/src/lib/colors';

/**
 * Root index screen — acts as a redirect gate.
 * Shows a loading spinner while the auth state is being restored from storage.
 * Once resolved it redirects to the correct route based on authentication status.
 */
export default function IndexScreen(): React.JSX.Element {
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isLoading) return;

    if (isAuthenticated) {
      router.replace('/home');
    } else {
      router.replace('/welcome');
    }
  }, [isLoading, isAuthenticated]);

  return (
    <View style={styles.root}>
      <ActivityIndicator size="large" color={Colors.white} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
