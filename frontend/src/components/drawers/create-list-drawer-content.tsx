import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { useCreateList, useUploadListIcon } from '@/src/hooks/use-lists';
import type { ListSummary, ListViewMode } from '@/src/types/lists.types';

interface CreateListDrawerContentProps {
  tmdbId: number;
  mediaType: 'film' | 'series';
  onBack: () => void;
  onListCreated: (newList: ListSummary) => void;
}

// Sheet-specific surface colors (follow the local-const pattern used by the
// other drawer content components).
const ICON_BG = '#0e0e0e';
const FIELD_BG = '#292929';
const TOGGLE_TRACK = '#1b1b1b';
const TOGGLE_ACTIVE = 'rgba(126, 126, 126, 0.19)';
const SAVE_DISABLED = '#8e8e8e';
const DIVIDER = '#3a3a3a';

/**
 * Body of the "Create list" step rendered inside `BottomDrawer`.
 *
 * Collects a name, optional description, optional icon image, ranked flag
 * and default view mode, then creates the list (and uploads the icon if
 * one was chosen) before handing the new list back to the parent.
 *
 * The icon is only uploaded after the list is created — until Save is
 * pressed the picked image lives purely as a local URI.
 */
export default function CreateListDrawerContent({
  tmdbId: _tmdbId,
  mediaType: _mediaType,
  onBack,
  onListCreated,
}: CreateListDrawerContentProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [iconUri, setIconUri] = useState<string | null>(null);
  const [isRanked, setIsRanked] = useState(true);
  const [viewMode, setViewMode] = useState<ListViewMode>('posters');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { create, isPending: isCreating } = useCreateList();
  const { upload, isPending: isUploading } = useUploadListIcon();

  const isSaving = isCreating || isUploading;
  const canSave = name.trim().length > 0 && !isSaving;

  const handlePickIcon = async (): Promise<void> => {
    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [87, 73],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]) {
      setIconUri(result.assets[0].uri);
    }
  };

  const handleSave = async (): Promise<void> => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || isSaving) return;

    setErrorMessage(null);
    const trimmedDescription = description.trim();

    let newList: ListSummary;
    try {
      newList = await create({
        title: trimmedName,
        description: trimmedDescription.length > 0 ? trimmedDescription : undefined,
        is_ranked: isRanked,
        view_mode: viewMode,
      });
    } catch {
      setErrorMessage('Something went wrong creating your list. Please try again.');
      return;
    }

    // The list now exists. Upload the icon as a best-effort follow-up so a
    // failed image upload never discards the created list.
    if (iconUri) {
      try {
        await upload({ listId: newList.id, imageUri: iconUri });
      } catch {
        setErrorMessage('Your list was created, but the image could not be uploaded.');
        return;
      }
    }

    onListCreated(newList);
  };

  return (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onBack}
          disabled={isSaving}
          hitSlop={10}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>New List</Text>
        <View style={styles.backButton} />
      </View>

      {/* Icon + Ranked toggle */}
      <View style={styles.iconRow}>
        <Pressable
          onPress={handlePickIcon}
          disabled={isSaving}
          style={({ pressed }) => [styles.iconSquare, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Choose list icon"
        >
          {iconUri ? (
            <Image source={{ uri: iconUri }} style={styles.iconImage} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={28} color={Colors.textMuted} />
          )}
          <View style={styles.editBadge}>
            <Ionicons name="pencil" size={11} color={Colors.white} />
          </View>
        </Pressable>

        <View style={styles.toggleTrack}>
          <Pressable
            onPress={() => setIsRanked(true)}
            disabled={isSaving}
            style={[styles.togglePill, isRanked && styles.togglePillActive]}
          >
            <Text style={[styles.toggleText, isRanked && styles.toggleTextActive]}>
              Ranked
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setIsRanked(false)}
            disabled={isSaving}
            style={[styles.togglePill, !isRanked && styles.togglePillActive]}
          >
            <Text style={[styles.toggleText, !isRanked && styles.toggleTextActive]}>
              Unranked
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Name */}
      <Text style={styles.fieldLabel}>NAME</Text>
      <View style={styles.fieldBox}>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={!isSaving}
          placeholder="List name"
          placeholderTextColor={Colors.textMuted}
          style={styles.nameInput}
          maxLength={255}
          autoCapitalize="sentences"
          returnKeyType="next"
        />
      </View>

      {/* Description */}
      <View style={[styles.fieldBox, styles.descriptionBox]}>
        <TextInput
          value={description}
          onChangeText={setDescription}
          editable={!isSaving}
          placeholder="Description..."
          placeholderTextColor={Colors.textMuted}
          style={styles.descriptionInput}
          maxLength={2000}
          multiline
          textAlignVertical="top"
          returnKeyType="done"
        />
      </View>

      {/* Default view mode */}
      <Text style={styles.fieldLabel}>DEFAULT VIEW MODE</Text>
      <View style={styles.viewModeBox}>
        <Pressable
          onPress={() => setViewMode('posters')}
          disabled={isSaving}
          style={styles.viewModeRow}
        >
          <Ionicons name="grid-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.viewModeText}>Posters</Text>
          {viewMode === 'posters' ? (
            <Ionicons
              name="checkmark"
              size={18}
              color={Colors.accentBlue}
              style={styles.viewModeCheck}
            />
          ) : null}
        </Pressable>
        <View style={styles.viewModeDivider} />
        <Pressable
          onPress={() => setViewMode('expanded')}
          disabled={isSaving}
          style={styles.viewModeRow}
        >
          <Ionicons name="list-outline" size={18} color={Colors.textMuted} />
          <Text style={styles.viewModeText}>Expanded</Text>
          {viewMode === 'expanded' ? (
            <Ionicons
              name="checkmark"
              size={18}
              color={Colors.accentBlue}
              style={styles.viewModeCheck}
            />
          ) : null}
        </Pressable>
      </View>

      {/* Save */}
      <Pressable
        onPress={handleSave}
        disabled={!canSave}
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        accessibilityRole="button"
        accessibilityLabel="Save list"
      >
        {isSaving ? (
          <ActivityIndicator color={Colors.buttonText} />
        ) : (
          <Text style={styles.saveText}>Save</Text>
        )}
      </Pressable>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      {/* TODOs (deferred):
          - Navigate to the new list's detail screen after creation.
          - Ranked ordering UI (drag-to-reorder) on the detail screen.
          - Collaborative lists (invite other members). */}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  // ── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: FontFamily.black,
    fontSize: 24,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  // ── Icon + Ranked toggle ─────────────────────────────────────────────────
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconSquare: {
    width: 110,
    height: 92,
    borderRadius: 12,
    backgroundColor: ICON_BG,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  iconImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    right: 6,
    bottom: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleTrack: {
    flexDirection: 'row',
    width: 206,
    height: 35,
    borderRadius: 50,
    backgroundColor: TOGGLE_TRACK,
    padding: 4,
  },
  togglePill: {
    flex: 1,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  togglePillActive: {
    backgroundColor: TOGGLE_ACTIVE,
  },
  toggleText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  toggleTextActive: {
    color: Colors.white,
  },
  // ── Fields ───────────────────────────────────────────────────────────────
  fieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldBox: {
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    paddingHorizontal: 14,
    justifyContent: 'center',
    marginBottom: 16,
  },
  nameInput: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.white,
    height: 43,
    paddingVertical: 0,
  },
  descriptionBox: {
    paddingVertical: 12,
  },
  descriptionInput: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.white,
    minHeight: 80,
    paddingVertical: 0,
  },
  // ── View mode ────────────────────────────────────────────────────────────
  viewModeBox: {
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    marginBottom: 22,
    overflow: 'hidden',
  },
  viewModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    height: 46,
  },
  viewModeText: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    marginLeft: 12,
  },
  viewModeCheck: {
    marginLeft: 'auto',
  },
  viewModeDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: DIVIDER,
    marginHorizontal: 14,
  },
  // ── Save ─────────────────────────────────────────────────────────────────
  saveButton: {
    height: 43,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: SAVE_DISABLED,
  },
  saveText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    color: Colors.buttonText,
  },
  errorText: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.errorRed,
    textAlign: 'center',
    marginTop: 12,
  },
});
