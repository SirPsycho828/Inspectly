import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Button } from '@/components/ui';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { signOut } from '@/services/auth';

export function SuspendedScreen() {
  const [loading, setLoading] = useState(false);

  async function handleSignOut() {
    setLoading(true);
    try {
      await signOut();
    } catch {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>⊘</Text>
      </View>

      {/* Heading */}
      <Text style={styles.heading}>Account Suspended</Text>

      {/* Message */}
      <Text style={styles.body}>
        Your account has been suspended and you are unable to access Inspectly at this time.
      </Text>

      <Text style={styles.bodySecondary}>
        If you believe this is a mistake, please contact your firm administrator or reach out to Inspectly support.
      </Text>

      {/* Contact card */}
      <View style={styles.contactCard}>
        <Text style={styles.contactLabel}>Need help?</Text>
        <Text style={styles.contactText}>support@inspectly.app</Text>
      </View>

      {/* Sign Out */}
      <Button
        title="Sign Out"
        onPress={handleSignOut}
        loading={loading}
        variant="secondary"
        fullWidth
        style={styles.signOutButton}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.slate[50],
    paddingHorizontal: layout.screenPaddingH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.errorBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconText: {
    fontSize: 36,
    color: colors.error,
  },
  heading: {
    ...typography.headingXl,
    color: colors.slate[900],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  body: {
    ...typography.body,
    color: colors.slate[500],
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  bodySecondary: {
    ...typography.body,
    color: colors.slate[400],
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  contactCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing['2xl'],
    width: '100%',
  },
  contactLabel: {
    ...typography.caption,
    color: colors.slate[400],
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contactText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
  signOutButton: {
    width: '100%',
  },
});
