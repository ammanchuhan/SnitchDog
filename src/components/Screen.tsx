import { ScrollView, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { space, useTheme } from '../theme';
import { TAB_BAR_CLEARANCE } from './TabBar';

/** Every screen sits on the same paper with the same gutter. */
export function Screen({
  children,
  scroll = true,
  style,
  edges = ['top', 'bottom'],
}: {
  children: React.ReactNode;
  scroll?: boolean;
  style?: ViewStyle;
  edges?: ('top' | 'bottom' | 'left' | 'right')[];
}) {
  const t = useTheme();
  const inner: ViewStyle = { paddingHorizontal: space(6), flexGrow: 1 };
  // The tab bar floats over the page, so nothing reserves space for it: every scrolling screen
  // has to leave its full height clear itself, or the last card ends up under the glass.
  const bottom = TAB_BAR_CLEARANCE;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={edges}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[inner, { paddingBottom: bottom }, style]}
          keyboardShouldPersistTaps="handled"
          // iOS scrolls the focused field clear of the keyboard, so a field near the bottom of a
          // screen (a new witness's name, say) isn't typed into blind.
          automaticallyAdjustKeyboardInsets
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[inner, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}
