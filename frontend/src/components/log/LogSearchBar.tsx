import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type TextInput as TextInputType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontFamily, Radius } from '@/src/lib/colors';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onFocus?: () => void;
  onClear?: () => void;
  autoFocus?: boolean;
  inputRef?: React.RefObject<TextInputType | null>;
}

/**
 * The active search input shown on the Log screen. Renders a real
 * `TextInput` so the user can type immediately. A clear (X) button
 * appears at the right whenever the input is non-empty.
 */
export default function LogSearchBar({
  value,
  onChangeText,
  onFocus,
  onClear,
  autoFocus,
  inputRef,
}: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrapper}>
        <Ionicons name="search" size={16} color={Colors.white} />
      </View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        autoFocus={autoFocus}
        placeholder="Search for movies, TV shows or people"
        placeholderTextColor="rgba(255,255,255,0.65)"
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        autoCapitalize="none"
      />
      {value.length > 0 && (
        <Ionicons
          name="close"
          size={18}
          color={Colors.white}
          onPress={onClear}
          suppressHighlighting
          style={styles.clearIcon}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 45,
    borderRadius: Radius.searchBar,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  iconWrapper: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    color: Colors.white,
    fontFamily: FontFamily.light,
    fontSize: 13,
    letterSpacing: -0.5,
    padding: 0,
  },
  clearIcon: {
    marginLeft: 8,
    padding: 4,
  },
});
