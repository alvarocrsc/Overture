import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  withSpring,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontFamily, FontSize } from '@/src/lib/colors';

type ActiveTab = 'films' | 'series';

interface Props {
  /** TMDB backdrop image URL for the header background. */
  backdropUri?: string | null;
  /** Currently selected content type. */
  activeTab: ActiveTab;
  /** Called when the user switches between Films and Series. */
  onTabChange: (tab: ActiveTab) => void;
  /** Called when the notification bell is pressed. */
  onNotificationPress?: () => void;
}

const TOGGLE_WIDTH = 227;
const TOGGLE_HEIGHT = 36;
const TOGGLE_PILL_WIDTH = 115;
const TOGGLE_PILL_HEIGHT = 30;
const TOGGLE_PILL_TOP = 3;
const TOGGLE_PILL_FILMS_X = 4;
const TOGGLE_PILL_SERIES_X = 108;
const HEADER_HEIGHT = 322;

/**
 * Full-width header for the Home screen. Shows a TMDB backdrop image,
 * a gradient overlay blending into the screen background, the "Home" title,
 * a notification bell, and a Films/Series content-type toggle.
 */
export default function HomeHeader({
  backdropUri,
  activeTab,
  onTabChange,
  onNotificationPress,
}: Props) {
  const insets = useSafeAreaInsets();
  const toggleX = useSharedValue(TOGGLE_PILL_FILMS_X);

  useEffect(() => {
    const target = activeTab === 'films' ? TOGGLE_PILL_FILMS_X : TOGGLE_PILL_SERIES_X;
    toggleX.value = withSpring(target, { damping: 50, stiffness: 350 });
  }, [activeTab]);

  const togglePillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: toggleX.value }],
  }));

  return (
    <View style={styles.header}>
      {/* Backdrop image */}
      {backdropUri ? (
        <Image
          source={{ uri: backdropUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.backdropFallback]} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(18,18,18,0.65)', Colors.background]}
        locations={[0.35, 0.7, 1.0]}
        style={StyleSheet.absoluteFill}
      />

      {/* Title row */}
      <View style={[styles.titleRow, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.homeTitle}>Home</Text>
        <Pressable
          onPress={onNotificationPress}
          hitSlop={12}
          style={styles.bellButton}
        >
          <Ionicons name="notifications-outline" size={22} color={Colors.white} />
        </Pressable>
      </View>

      {/* Films / Series toggle */}
      <View style={styles.toggleContainer}>
        {/* Animated background pill */}
        <Animated.View style={[styles.togglePill, togglePillStyle]} />

        <Pressable
          style={styles.toggleOption}
          onPress={() => onTabChange('films')}
        >
          <Text style={styles.toggleText}>Films</Text>
        </Pressable>
        <Pressable
          style={styles.toggleOption}
          onPress={() => onTabChange('series')}
        >
          <Text style={styles.toggleText}>Series</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: HEADER_HEIGHT,
    overflow: 'hidden',
  },
  backdropFallback: {
    backgroundColor: '#1a1a1a',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 'auto',
  },
  homeTitle: {
    fontFamily: FontFamily.black,
    fontSize: FontSize.heading,
    color: Colors.white,
    letterSpacing: -2,
    lineHeight: 38,
  },
  bellButton: {
    padding: 4,
  },
  toggleContainer: {
    position: 'absolute',
    left: 93,
    bottom: 12,
    width: TOGGLE_WIDTH,
    height: TOGGLE_HEIGHT,
    borderRadius: 50,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  togglePill: {
    position: 'absolute',
    top: TOGGLE_PILL_TOP,
    left: 0,
    width: TOGGLE_PILL_WIDTH,
    height: TOGGLE_PILL_HEIGHT,
    borderRadius: 25,
    backgroundColor: 'rgba(126,126,126,0.19)',
  },
  toggleOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleText: {
    fontFamily: FontFamily.extraBold,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: -1,
  },
});
