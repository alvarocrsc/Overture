import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import type { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';

interface DateSeenSheetProps {
  visible: boolean;
  value: Date;
  onChange: (next: Date) => void;
  onClose: () => void;
}

/**
 * Bottom sheet wrapping the native spinner date picker for "Date seen". On
 * iOS it renders inline inside a dark sheet; on Android the native modal
 * picker is shown directly when `visible` flips on.
 */
export function DateSeenSheet({
  visible,
  value,
  onChange,
  onClose,
}: DateSeenSheetProps): React.JSX.Element | null {
  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        value={value}
        mode="date"
        display="spinner"
        maximumDate={new Date()}
        onChange={(event: DateTimePickerEvent, selected) => {
          // On Android the dialog is dismissed automatically.
          onClose();
          if (event.type === 'set' && selected) {
            onChange(selected);
          }
        }}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.done}>Done</Text>
          </Pressable>
        </View>
        <DateTimePicker
          value={value}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          textColor={Colors.white}
          themeVariant="dark"
          onChange={(_event: DateTimePickerEvent, selected) => {
            if (selected) onChange(selected);
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1b1b1b',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2e2e2e',
  },
  done: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.accentBlue,
    letterSpacing: LetterSpacing.tight,
  },
});
