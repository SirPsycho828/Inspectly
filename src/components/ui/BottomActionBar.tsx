import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '@/constants/theme';

interface BottomActionBarProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function BottomActionBar({ children, style }: BottomActionBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.base) }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.slate[200],
    paddingHorizontal: spacing.base,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
