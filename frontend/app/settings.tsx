import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { BackButton } from '@/src/components/auth/BackButton';
import { useAuth } from '@/src/context/AuthContext';
import { Colors, FontFamily, LetterSpacing } from '@/src/lib/colors';

/**
 * Settings screen.
 *
 * Currently the only functional action is Sign Out — every other row is
 * a placeholder for post-deadline work. Sections (Profile / Appearance
 * / About / Account) are separated by hairline dividers and the bottom
 * holds two pill CTAs (Discord, Contact Us).
 */
export default function SettingsScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();

  const handleSignOut = (): void => {
    Alert.alert(
      'Sign out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void logout(),
        },
      ],
      { cancelable: true },
    );
  };

  const notImplemented = (label: string): void => {
    Alert.alert(label, 'This feature is coming soon.');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <View style={styles.backButton}>
          <BackButton />
        </View>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.username}>
          {user?.username ? `@${user.username}` : ''}
        </Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 40 },
        ]}
      >
        <SectionLabel label="Profile" />
        <Row
          icon={<Ionicons name="person-circle-outline" size={26} color={Colors.white} />}
          label="Account & Privacy"
          onPress={() => notImplemented('Account & Privacy')}
        />
        <Row
          icon={<Ionicons name="cloud-upload-outline" size={24} color={Colors.white} />}
          label="Import from Letterboxd"
          onPress={() => notImplemented('Import from Letterboxd')}
        />
        <Row
          icon={<Ionicons name="log-out-outline" size={26} color={Colors.errorRed} />}
          label="Sign Out"
          labelColor={Colors.errorRed}
          onPress={handleSignOut}
        />

        <Divider />

        <SectionLabel label="Appearance" />
        <Row
          icon={<Ionicons name="contrast-outline" size={24} color={Colors.white} />}
          label="Theme"
          sublabel="Current: Dark"
          onPress={() => notImplemented('Theme')}
        />

        <Divider />

        <SectionLabel label="About" />
        <Row
          icon={<Ionicons name="information-circle-outline" size={26} color={Colors.white} />}
          label="Version 1.0.0 (01)"
          disabled
        />
        <Row
          icon={<Ionicons name="shield-checkmark-outline" size={24} color={Colors.white} />}
          label="Privacy Policy"
          onPress={() => notImplemented('Privacy Policy')}
        />

        <Divider />

        <SectionLabel label="Account" />
        <Row
          icon={<Ionicons name="trash-outline" size={24} color={Colors.errorRed} />}
          label="Delete Account"
          labelColor={Colors.errorRed}
          onPress={() => notImplemented('Delete Account')}
        />

        <View style={styles.ctaRow}>
          <Pressable
            onPress={() => notImplemented('Discord')}
            style={({ pressed }) => [
              styles.ctaButton,
              styles.discordButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="logo-discord" size={18} color={Colors.white} />
            <Text style={styles.ctaText}>Discord</Text>
          </Pressable>
          <Pressable
            onPress={() => notImplemented('Contact Us')}
            style={({ pressed }) => [
              styles.ctaButton,
              styles.contactButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="mail-outline" size={18} color={Colors.white} />
            <Text style={styles.ctaText}>Contact Us</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Row ────────────────────────────────────────────────────────────────────

interface RowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  labelColor?: string;
  disabled?: boolean;
  onPress?: () => void;
}

function Row({
  icon,
  label,
  sublabel,
  labelColor,
  disabled,
  onPress,
}: RowProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      style={({ pressed }) => [styles.row, pressed && !disabled && styles.pressed]}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, labelColor != null && { color: labelColor }]}>
          {label}
        </Text>
        {sublabel != null && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }): React.JSX.Element {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backButton: {
    marginBottom: 6,
  },
  title: {
    fontFamily: FontFamily.black,
    fontSize: 32,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  username: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  sectionLabel: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    marginTop: 16,
    marginBottom: 8,
    includeFontPadding: false,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 14,
  },
  rowIcon: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  rowSublabel: {
    marginTop: 2,
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#2a2a2a',
    marginVertical: 12,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 28,
  },
  ctaButton: {
    flex: 1,
    height: 44,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  discordButton: {
    backgroundColor: '#5865F2',
  },
  contactButton: {
    backgroundColor: '#000000',
  },
  ctaText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: LetterSpacing.tight,
    includeFontPadding: false,
  },
  pressed: {
    opacity: 0.7,
  },
});
