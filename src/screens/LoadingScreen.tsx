import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, typography } from '@/constants/theme';

export function LoadingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>INSPECTLY</Text>
      <Text style={styles.tagline}>Professional Inspection Reports</Text>
      <ActivityIndicator
        size="large"
        color={colors.white}
        style={styles.spinner}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.teal[600],
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 4,
  },
  tagline: {
    ...typography.body,
    color: colors.teal[50],
    marginTop: 8,
    letterSpacing: 0.5,
  },
  spinner: {
    marginTop: 48,
  },
});
