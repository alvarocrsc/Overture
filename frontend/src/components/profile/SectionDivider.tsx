import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Colors, FontFamily } from '@/src/lib/colors';

interface SectionDividerProps {
  prefix: string;
  label: string;
  lineWidth?: number;
}

export default function SectionDivider({
  prefix,
  label,
  lineWidth = 100,
}: SectionDividerProps): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={[styles.line, { width: lineWidth }]} />
      <Text style={styles.text} numberOfLines={1}>
        <Text style={styles.prefix}>{prefix}</Text>
        <Text style={styles.spacer}>   </Text>
        <Text style={styles.label}>{label}</Text>
      </Text>
      <View style={[styles.line, { width: lineWidth }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: 32,
  },
  line: {
    height: 1,
    backgroundColor: '#3A3A3A',
  },
  text: {
    flex: 0,
    paddingHorizontal: 12,
    textAlign: 'center',
    letterSpacing: -1,
    fontSize: 14,
  },
  prefix: {
    color: Colors.white,
    fontFamily: FontFamily.bold,
    fontSize: 14,
  },
  spacer: {
    color: 'transparent',
  },
  label: {
    color: Colors.accentBlue,
    fontFamily: FontFamily.medium,
    fontSize: 14,
    textTransform: 'uppercase',
  },
});
