import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { colors, typography, touchTargets, layout } from '@/constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'destructive' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}: ButtonProps) {
  const buttonStyles = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.base,
        buttonStyles.container,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'secondary' || variant === 'ghost' ? colors.teal[600] : colors.white}
          size="small"
        />
      ) : (
        <Text style={[styles.text, buttonStyles.text]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: touchTargets.primaryButton,
    borderRadius: layout.borderRadius,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  fullWidth: {
    flex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.bodyMedium,
  },
});

const variantStyles = {
  primary: StyleSheet.create({
    container: { backgroundColor: colors.teal[600] },
    text: { color: colors.white } as TextStyle,
  }),
  secondary: StyleSheet.create({
    container: {
      backgroundColor: colors.white,
      borderWidth: 1,
      borderColor: colors.slate[300],
    },
    text: { color: colors.slate[700] } as TextStyle,
  }),
  destructive: StyleSheet.create({
    container: { backgroundColor: colors.severity.critical },
    text: { color: colors.white } as TextStyle,
  }),
  ghost: StyleSheet.create({
    container: { backgroundColor: 'transparent' },
    text: { color: colors.teal[600] } as TextStyle,
  }),
};
