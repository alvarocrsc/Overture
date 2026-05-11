import React, { useEffect, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

import { Colors, FontFamily, LetterSpacing, Radius } from '@/src/lib/colors';
import { backdropUrl, logoUrl } from '@/src/lib/tmdb';
import type { SeriesDetail, SeriesImages } from '@/src/types/series.types';
import InteractiveStarRating from '@/src/components/film/InteractiveStarRating';

interface SeriesActionDrawerProps {
  visible: boolean;
  onClose: () => void;
  series: SeriesDetail;
  images: SeriesImages | undefined;
  onToggleLogged: () => void;
  onChangeRating: (value: number) => void;
  onToggleLiked: () => void;
  onAddToList: () => void;
  onChangeAppearance: () => void;
}

export default function SeriesActionDrawer({
  visible,
  onClose,
  series,
  images,
  onToggleLogged,
  onChangeRating,
  onToggleLiked,
  onAddToList,
  onChangeAppearance,
}: SeriesActionDrawerProps): React.JSX.Element {
  const [rating, setRating] = useState<number>(series.user_rating ?? 0);

  useEffect(() => {
    if (visible) setRating(series.user_rating ?? 0);
  }, [visible, series.user_rating]);

  const handleRatingChange = (value: number): void => {
    setRating(value);
    onChangeRating(value);
  };

  const handleShare = async (): Promise<void> => {
    try {
      await Share.share({ message: `${series.title} on Overture` });
    } catch {
    }
  };

  const backdropPath = series.custom_backdrop_path ?? series.backdrop_path;
  const backdropImage = backdropUrl(backdropPath, 'w1280');

  const logo =
    images?.logos.find((l) => l.iso_639_1 === 'en') ?? images?.logos[0];
  const logoSrc = logo ? logoUrl(logo.file_path, 'w300') : null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <ImageBackground
        source={backdropImage ? { uri: backdropImage } : undefined}
        style={styles.background}
        resizeMode="cover"
      >
        <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.dim} />

        <Pressable style={styles.dismissArea} onPress={onClose}>
          <View style={styles.titleWrap} pointerEvents="none">
            {logoSrc ? (
              <Image
                source={{ uri: logoSrc }}
                style={styles.logo}
                resizeMode="contain"
              />
            ) : (
              <Text style={styles.titleFallback} numberOfLines={2}>
                {series.title}
              </Text>
            )}
          </View>
        </Pressable>

        <View style={styles.sheetContainer}>
          <View style={styles.sheet}>
            <View style={styles.dragHandle} />

            <View style={styles.statsRow}>
              <StatusCell
                label="LOGGED"
                active={series.is_logged}
                onPress={onToggleLogged}
              >
                <Ionicons
                  name={series.is_logged ? 'checkmark-circle' : 'checkmark-circle-outline'}
                  size={28}
                  color={series.is_logged ? Colors.accentBlue : Colors.white}
                />
              </StatusCell>

              <View style={styles.statCell}>
                <InteractiveStarRating
                  value={rating}
                  onChange={handleRatingChange}
                  size={22}
                  gap={2}
                />
                <Text style={styles.statLabel}>RATING</Text>
              </View>

              <StatusCell
                label="LIKED"
                active={series.is_liked}
                onPress={onToggleLiked}
              >
                <Ionicons
                  name={series.is_liked ? 'heart' : 'heart-outline'}
                  size={28}
                  color={series.is_liked ? Colors.accentBlue : Colors.white}
                />
              </StatusCell>
            </View>

            <ActionRow label="Add to list" onPress={onAddToList} topDivider />
            <ActionRow
              label="Change poster | Backdrop"
              onPress={onChangeAppearance}
            />
            <ActionRow label="Share" onPress={handleShare} topDivider />
          </View>

          <Pressable
            onPress={onClose}
            style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
          >
            <Text style={styles.closeLabel}>Close</Text>
          </Pressable>
        </View>
      </ImageBackground>
    </Modal>
  );
}

interface StatusCellProps {
  label: string;
  active: boolean;
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
  topDivider?: boolean;
}

function ActionRow({
  label,
  onPress,
  topDivider,
}: ActionRowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionRow,
        topDivider && styles.actionRowDivider,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const SHEET_BG = '#242424';
const DIVIDER = '#121212';

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  dismissArea: {
    flex: 1,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  logo: {
    width: 240,
    height: 80,
  },
  titleFallback: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  sheetContainer: {
    paddingHorizontal: 8,
    paddingBottom: 28,
    gap: 8,
  },
  sheet: {
    backgroundColor: SHEET_BG,
    borderRadius: 10,
    overflow: 'hidden',
  },
  dragHandle: {
    width: 70,
    height: 3,
    borderRadius: Radius.progress,
    backgroundColor: Colors.white,
    alignSelf: 'center',
    marginTop: 13,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 18,
    paddingBottom: 18,
  },
  statCell: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 110,
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
  actionRowDivider: {
    borderTopWidth: 1.1,
    borderTopColor: DIVIDER,
  },
  actionLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  closeButton: {
    height: 49,
    borderRadius: 10,
    backgroundColor: SHEET_BG,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontFamily: FontFamily.extraBold,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  pressed: {
    opacity: 0.7,
  },
});
