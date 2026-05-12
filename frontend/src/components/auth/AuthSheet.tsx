import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { Colors, Radius } from '@/src/lib/colors';
import { DragHandle } from './DragHandle';

interface AuthSheetProps {
  children: React.ReactNode;
  /** Optional animated style — used by screens that shift the sheet above the keyboard. */
  style?: StyleProp<ViewStyle>;
}

/**
 * Dark bottom sheet with rounded top corners used by the Welcome and
 * Login screens. Renders a DragHandle at the top, followed by children.
 * Accepts an optional `style` prop for animated positioning (e.g. keyboard-aware lift).
 */
export function AuthSheet({ children, style }: AuthSheetProps): React.JSX.Element {
  return (
    <Animated.View style={[styles.sheet, style]}>
      <DragHandle />
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 422,
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.sheet,
    borderTopRightRadius: Radius.sheet,
    overflow: 'hidden',
  },
});
