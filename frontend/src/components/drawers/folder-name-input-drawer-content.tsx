import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useKeyboardHandler } from 'react-native-keyboard-controller';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';
import { useCreateFolder } from '@/src/hooks/use-lists';
import type { ListFolder } from '@/src/types/lists.types';

const FIELD_BG = '#292929';
const CONFIRM_DISABLED = '#8e8e8e';

interface FolderNameInputDrawerContentProps {
  /** Parent folder for the new folder, or null to create at the root. */
  parentFolderId: number | null;
  /** Returns to the previous step without creating anything. */
  onCancel: () => void;
  /** Called with the created folder once the request succeeds. */
  onCreated: (folder: ListFolder) => void;
}

/**
 * Body of the "New Folder" step rendered inside `BottomDrawer`.
 *
 * Collects a folder name and creates the folder under `parentFolderId`.
 *
 * Keyboard handling: `useKeyboardAnimation` adds animated `paddingBottom`
 * equal to the keyboard height. Because BottomDrawer measures its children
 * via `onLayout`, the sheet automatically grows and slides above the keyboard
 * as the user types.
 */
export default function FolderNameInputDrawerContent({
  parentFolderId,
  onCancel,
  onCreated,
}: FolderNameInputDrawerContentProps): React.JSX.Element {
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { create, isPending } = useCreateFolder();

  // Track keyboard height in a Reanimated SharedValue so BottomDrawer's
  // onLayout callback sees the increased height and slides the sheet up.
  const kbHeight = useSharedValue(0);
  useKeyboardHandler(
    {
      onMove: (e) => {
        'worklet';
        kbHeight.value = e.height;
      },
      onEnd: (e) => {
        'worklet';
        kbHeight.value = e.height;
      },
    },
    [],
  );
  const paddingStyle = useAnimatedStyle(() => ({
    paddingBottom: kbHeight.value,
  }));

  const canConfirm = name.trim().length > 0 && !isPending;

  const handleConfirm = async (): Promise<void> => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || isPending) return;

    setErrorMessage(null);
    try {
      const folder = await create({ name: trimmed, parentFolderId });
      onCreated(folder);
    } catch {
      setErrorMessage(
        'Something went wrong creating your folder. Please try again.',
      );
    }
  };

  return (
    <Animated.View style={paddingStyle}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={onCancel}
          disabled={isPending}
          hitSlop={10}
          style={({ pressed }) => [
            styles.backButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Ionicons name="chevron-back" size={22} color={Colors.white} />
        </Pressable>
        <Text style={styles.headerTitle}>New Folder</Text>
        <View style={styles.backButton} />
      </View>

      {/* Name */}
      <Text style={styles.fieldLabel}>NAME</Text>
      <View style={styles.fieldBox}>
        <TextInput
          value={name}
          onChangeText={setName}
          editable={!isPending}
          placeholder="Folder name"
          placeholderTextColor={Colors.textMuted}
          style={styles.nameInput}
          maxLength={100}
          autoCapitalize="sentences"
          autoFocus
          returnKeyType="done"
          onSubmitEditing={() => {
            void handleConfirm();
          }}
        />
      </View>

      {/* Confirm */}
      <Pressable
        onPress={() => {
          void handleConfirm();
        }}
        disabled={!canConfirm}
        style={[
          styles.confirmButton,
          !canConfirm && styles.confirmButtonDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Create folder"
      >
        {isPending ? (
          <ActivityIndicator color={Colors.buttonText} />
        ) : (
          <Text style={styles.confirmText}>Create</Text>
        )}
      </Pressable>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
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
    fontSize: 22,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  fieldLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 11,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginBottom: 8,
    marginLeft: 4,
  },
  fieldBox: {
    backgroundColor: FIELD_BG,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    justifyContent: 'center',
    marginBottom: 18,
  },
  nameInput: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.white,
    padding: 0,
  },
  confirmButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: CONFIRM_DISABLED,
  },
  confirmText: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.buttonText,
    letterSpacing: LetterSpacing.tight,
  },
  errorText: {
    fontFamily: FontFamily.medium,
    fontSize: 12,
    color: Colors.errorRed,
    marginTop: 10,
    textAlign: 'center',
  },
});
