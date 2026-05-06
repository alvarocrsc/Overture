/**
 * Centralised design tokens sourced directly from the Figma file.
 * Every color, font name, size, spacing and radius value used in
 * the auth flow lives here as a named constant.
 */

// ─── Colors ──────────────────────────────────────────────────────────────────

export const Colors = {
  /** Main app background — #121212 */
  background: '#121212',
  /** Primary accent blue — #1a77da */
  accentBlue: '#1a77da',
  /** Pure white — button fill, primary text */
  white: '#FFFFFF',
  /** Muted subtitle / placeholder text — #a5a5a5 */
  textMuted: '#a5a5a5',
  /** Skip button background — #2e2e2e */
  skipBackground: '#2e2e2e',
  /** Progress bar track — #525252 */
  progressTrack: '#525252',
  /** Progress bar fill — white */
  progressFill: '#FFFFFF',
  /** Error / unmet requirement text */
  errorRed: '#FF4D4F',
  /** Success / requirement met text */
  successGreen: '#52C41A',
  /** Dark text rendered on white buttons */
  buttonText: '#121212',
  /** Outlined input border — white */
  inputBorder: '#FFFFFF',
  /** Search bar background — transparent */
  searchBackground: 'transparent',
} as const;

// ─── Typography ──────────────────────────────────────────────────────────────

export const FontFamily = {
  black: 'Geist_900Black',
  extraBold: 'Geist_800ExtraBold',
  bold: 'Geist_700Bold',
  regular: 'Geist_400Regular',
  light: 'Geist_300Light',
} as const;

export const FontSize = {
  heading: 32,
  inputLarge: 24,
  body: 15,
  subtitle: 14,
  caption: 12,
  small: 13,
} as const;

export const LetterSpacing = {
  tight: -1,
} as const;

// ─── Spacing & Sizing ─────────────────────────────────────────────────────────

export const Spacing = {
  /** Horizontal screen padding */
  screenH: 20,
  /** Horizontal padding for buttons / inputs */
  buttonH: 33,
} as const;

export const Radius = {
  sheet: 20,
  button: 12,
  skip: 8,
  progress: 100,
  poster: 6,
  searchBar: 50,
  avatar: 100,
} as const;

export const Dimensions = {
  /** Progress bar outer track */
  progressBarWidth: 100,
  progressBarHeight: 8,
  /** Primary action button */
  buttonWidth: 323,
  buttonHeight: 43,
  /** Upload / secondary button on profile-picture step */
  uploadButtonWidth: 204,
  uploadButtonHeight: 38,
  /** Skip pill button */
  skipButtonWidth: 80,
  skipButtonHeight: 30,
  /** Profile avatar circle */
  avatarSize: 133,
  /** Drag handle bar */
  dragHandleWidth: 70,
  dragHandleHeight: 3,
  /** Outlined input */
  inputHeight: 43,
  /** Search bar */
  searchBarHeight: 45,
  /** Favorites poster grid columns */
  posterGridColumns: 4,
  posterWidth: 80,
  posterAspect: 1.5, // height = width * aspect
} as const;
