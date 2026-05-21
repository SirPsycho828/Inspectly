import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Button } from '@/components/ui';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { resendVerificationEmail, signOut } from '@/services/auth';
import { useAuthContext } from '@/contexts/AuthContext';

export function VerifyEmailScreen() {
  const { firebaseUser } = useAuthContext();
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');
  const [signOutLoading, setSignOutLoading] = useState(false);

  async function handleResend() {
    setResendLoading(true);
    setResendError('');
    setResendSuccess(false);
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
    } catch {
      setResendError('Could not resend the email. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSignOut() {
    setSignOutLoading(true);
    try {
      await signOut();
    } catch {
      setSignOutLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Icon placeholder */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>✉</Text>
      </View>

      <Text style={styles.heading}>Check your email</Text>

      <Text style={styles.body}>
        We sent a verification link to{'\n'}
        <Text style={styles.email}>{firebaseUser?.email ?? 'your email address'}</Text>
      </Text>

      <Text style={styles.bodySecondary}>
        Open the link in the email to verify your account, then come back here.
      </Text>

      {/* Success message */}
      {resendSuccess ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>Verification email sent.</Text>
        </View>
      ) : null}

      {/* Error message */}
      {resendError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{resendError}</Text>
        </View>
      ) : null}

      <Button
        title="Resend Verification Email"
        onPress={handleResend}
        loading={resendLoading}
        fullWidth
        style={styles.resendButton}
      />

      <TouchableOpacity
        style={styles.signOutLink}
        onPress={handleSignOut}
        disabled={signOutLoading}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.signOutText}>
          {signOutLoading ? 'Signing out...' : 'Sign Out'}
        </Text>
      </TouchableOpacity>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.teal[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconText: {
    fontSize: 32,
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
    marginBottom: spacing.sm,
  },
  email: {
    ...typography.bodyMedium,
    color: colors.slate[700],
  },
  bodySecondary: {
    ...typography.body,
    color: colors.slate[400],
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  successBox: {
    backgroundColor: colors.successBg,
    borderRadius: layout.borderRadius,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.base,
    width: '100%',
  },
  successText: {
    ...typography.body,
    color: colors.success,
    textAlign: 'center',
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: layout.borderRadius,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.base,
    width: '100%',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
  },
  resendButton: {
    width: '100%',
  },
  signOutLink: {
    marginTop: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
  },
  signOutText: {
    ...typography.bodyMedium,
    color: colors.slate[500],
  },
});
