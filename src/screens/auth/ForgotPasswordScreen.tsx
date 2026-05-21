import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/navigation/AuthNavigator';
import { Button } from '@/components/ui';
import { colors, typography, spacing, layout } from '@/constants/theme';
import { sendPasswordReset } from '@/services/auth';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  function validateEmail(): boolean {
    setEmailError('');
    if (!email.trim()) {
      setEmailError('Email is required.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setEmailError('Enter a valid email address.');
      return false;
    }
    return true;
  }

  async function handleSendReset() {
    if (!validateEmail()) return;
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      setSubmitted(true);
    } catch (err: any) {
      const code: string = err?.code ?? '';
      if (code === 'auth/user-not-found') {
        // Don't reveal whether an account exists — show success regardless
        setSubmitted(true);
      } else if (code === 'auth/invalid-email') {
        setEmailError('Enter a valid email address.');
      } else {
        setEmailError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>✓</Text>
        </View>
        <Text style={styles.successHeading}>Check your inbox</Text>
        <Text style={styles.successBody}>
          If an account exists for{' '}
          <Text style={styles.successEmail}>{email.trim()}</Text>
          , you'll receive a password reset link shortly.
        </Text>
        <Button
          title="Back to Sign In"
          onPress={() => navigation.navigate('SignIn')}
          fullWidth
          style={styles.backButton}
        />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back link */}
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backLinkText}>← Back</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerArea}>
          <Text style={styles.logoText}>INSPECTLY</Text>
          <Text style={styles.heading}>Reset your password</Text>
          <Text style={styles.subheading}>
            Enter your email and we'll send you a link to reset your password.
          </Text>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, emailError ? styles.inputError : null]}
              value={email}
              onChangeText={(v) => { setEmail(v); setEmailError(''); }}
              placeholder="you@example.com"
              placeholderTextColor={colors.slate[400]}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="done"
              onSubmitEditing={handleSendReset}
            />
            {emailError ? <Text style={styles.fieldError}>{emailError}</Text> : null}
          </View>

          <Button
            title="Send Reset Link"
            onPress={handleSendReset}
            loading={loading}
            fullWidth
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: colors.slate[50],
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: layout.screenPaddingH,
    paddingTop: 56,
    paddingBottom: 32,
  },
  backLink: {
    marginBottom: spacing.xl,
    minHeight: 48,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  backLinkText: {
    ...typography.bodyMedium,
    color: colors.teal[600],
  },
  headerArea: {
    alignItems: 'center',
    marginBottom: spacing['2xl'],
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.teal[600],
    letterSpacing: 3,
    marginBottom: spacing.base,
  },
  heading: {
    ...typography.headingXl,
    color: colors.slate[900],
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subheading: {
    ...typography.body,
    color: colors.slate[500],
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate[200],
    borderRadius: layout.borderRadius,
    padding: layout.cardPadding,
  },
  fieldGroup: {
    marginBottom: spacing.base,
  },
  label: {
    ...typography.bodyMedium,
    color: colors.slate[700],
    marginBottom: spacing.xs,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: colors.slate[300],
    borderRadius: layout.borderRadius,
    paddingHorizontal: 16,
    ...typography.body,
    color: colors.slate[900],
    backgroundColor: colors.white,
  },
  inputError: {
    borderColor: colors.error,
  },
  fieldError: {
    ...typography.caption,
    color: colors.error,
    marginTop: spacing.xs,
  },
  // Success state
  successContainer: {
    flex: 1,
    backgroundColor: colors.slate[50],
    paddingHorizontal: layout.screenPaddingH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: spacing['3xl'],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.successBg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  iconText: {
    fontSize: 28,
    color: colors.success,
    fontWeight: '700',
  },
  successHeading: {
    ...typography.headingXl,
    color: colors.slate[900],
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  successBody: {
    ...typography.body,
    color: colors.slate[500],
    textAlign: 'center',
    marginBottom: spacing['2xl'],
    lineHeight: 22,
  },
  successEmail: {
    ...typography.bodyMedium,
    color: colors.slate[700],
  },
  backButton: {
    width: '100%',
  },
});
