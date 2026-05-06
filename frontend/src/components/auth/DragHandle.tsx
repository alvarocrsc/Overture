import { StyleSheet, View } from 'react-native';
import { Colors, Dimensions, Radius } from '@/src/lib/colors';

/**
 * Small horizontal pill shown at the top of every bottom sheet.
 * No props required — purely decorative.
 */
export function DragHandle(): React.JSX.Element {
  return <View style={styles.handle} />;
}

const styles = StyleSheet.create({
  handle: {
    width: Dimensions.dragHandleWidth,
    height: Dimensions.dragHandleHeight,
    borderRadius: Radius.progress,
    backgroundColor: Colors.white,
    alignSelf: 'center',
    marginTop: 15,
  },
});
