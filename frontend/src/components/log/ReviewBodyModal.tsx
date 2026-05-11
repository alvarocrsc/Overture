import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';

interface ReviewBodyModalProps {
  visible: boolean;
  initialValue: string;
  onSave: (next: string) => void;
  onClose: () => void;
}

export function ReviewBodyModal({
  visible,
  initialValue,
  onSave,
  onClose,
}: ReviewBodyModalProps): React.JSX.Element {
  const [draft, setDraft] = useState<string>(initialValue);

  useEffect(() => {
    if (visible) {
      setDraft(initialValue);
    }
  }, [visible, initialValue]);

  const handleDone = (): void => {
    onSave(draft);
  };

  return (
    <Modal
      visible={visible}
      presentationStyle="pageSheet"
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.headerAction}>Cancel</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Review</Text>
          <Pressable onPress={handleDone} hitSlop={12}>
            <Text style={[styles.headerAction, styles.doneAction]}>Done</Text>
          </Pressable>
        </View>
        <KeyboardAvoidingView
          style={styles.body}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write your review..."
            placeholderTextColor={Colors.textMuted}
            multiline
            autoFocus
            textAlignVertical="top"
            style={styles.input}
            selectionColor={Colors.accentBlue}
          />
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2e2e2e',
  },
  headerTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
  },
  headerAction: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
  },
  doneAction: {
    color: Colors.accentBlue,
    fontFamily: FontFamily.medium,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    lineHeight: 22,
  },
});
