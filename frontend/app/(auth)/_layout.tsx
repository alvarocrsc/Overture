import { Stack } from 'expo-router';
import { Colors } from '@/src/lib/colors';

/**
 * Stack layout for the (auth) group.
 * All auth screens share a dark background and no visible header.
 */
export default function AuthLayout(): React.JSX.Element {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}
