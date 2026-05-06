import { StyleSheet, View } from 'react-native';
import { Colors, Radius } from '@/src/lib/colors';
import { DragHandle } from './DragHandle';

interface AuthSheetProps {
  children: React.ReactNode;
}

/**
 * Dark bottom sheet with rounded top corners used by the Welcome and
 * Login screens. Renders a DragHandle at the top, followed by children.
 */
export function AuthSheet({ children }: AuthSheetProps): React.JSX.Element {
  return (
    <View style={styles.sheet}>
      <DragHandle />
      {children}
    </View>
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
