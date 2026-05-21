import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, layout } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, ...(Array.isArray(style) ? style : [style])]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    padding: layout.cardPadding,
  },
});
